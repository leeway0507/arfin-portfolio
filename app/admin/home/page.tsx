'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ImageUp, Monitor, Save, Smartphone, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { HomeImageRenderer } from '@/components/home/home-image-renderer'
import { Nav } from '@/components/nav/nav'
import { AdminManagementLayout } from '../components/admin-management-layout'
import { useAuth } from '@/hooks/use-auth'
import { getPublicHomeImage, updateHomeImageLayout, uploadHomeImage } from '@/lib/apis/home/api'
import type { HomeImage, HomeImageLayout } from '@/lib/apis/home/types'
import {
    DEFAULT_HOME_IMAGE_LAYOUT,
    HOME_IMAGE_LAYOUT_PRESETS,
    normalizeHomeImageLayout,
} from '@/lib/apis/home/layout'
import {
    ACCEPTED_IMAGE_EXTENSIONS,
    ACCEPTED_IMAGE_MIME_TYPES,
    compressImageFile,
    filterImageFiles,
} from '@/lib/images/compression'
import { cn } from '@/lib/utils'

const LAYOUT_OPTIONS: Array<{
    label: string
    layout: HomeImageLayout
}> = [
        { label: '작게', layout: HOME_IMAGE_LAYOUT_PRESETS.compact },
        { label: '기본', layout: HOME_IMAGE_LAYOUT_PRESETS.default },
        { label: '넓게', layout: HOME_IMAGE_LAYOUT_PRESETS.wide },
        { label: '크게', layout: HOME_IMAGE_LAYOUT_PRESETS.full },
    ]

export default function HomeManagementPage() {
    const router = useRouter()
    const { user, isLoading: isAuthLoading, isAllowed, signOut } = useAuth()
    const [homeImage, setHomeImage] = useState<HomeImage | null>(null)
    const [layoutDraft, setLayoutDraft] = useState<HomeImageLayout>(DEFAULT_HOME_IMAGE_LAYOUT)
    const [savedLayout, setSavedLayout] = useState<HomeImageLayout>(DEFAULT_HOME_IMAGE_LAYOUT)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isLayoutSaving, setIsLayoutSaving] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isCustomOpen, setIsCustomOpen] = useState(false)
    const [previewMode, setPreviewMode] = useState<'pc' | 'mobile'>('pc')
    const [error, setError] = useState<string | null>(null)
    const previewUrlRef = useRef<string | null>(null)

    useEffect(() => {
        if (!isAuthLoading && (!user || !isAllowed)) {
            router.replace('/admin')
        }
    }, [isAuthLoading, user, isAllowed, router])

    const getToken = useCallback(() => user?.getIdToken() ?? Promise.resolve(null), [user])

    const loadHomeImage = useCallback(async () => {
        if (!user || !isAllowed) return
        setIsLoading(true)
        setError(null)
        try {
            const image = await getPublicHomeImage()
            setHomeImage(image)
            setLayoutDraft(image.layout)
            setSavedLayout(image.layout)
        } catch (e) {
            setError(e instanceof Error ? e.message : '홈 대표 이미지를 불러오지 못했습니다.')
        } finally {
            setIsLoading(false)
        }
    }, [user, isAllowed])

    useEffect(() => {
        if (user && isAllowed) {
            loadHomeImage()
        }
    }, [user, isAllowed, loadHomeImage])

    useEffect(() => {
        return () => {
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
        }
    }, [])

    const applyLayoutDraft = useCallback((nextLayout: HomeImageLayout) => {
        const normalized = normalizeHomeImageLayout(nextLayout)
        setLayoutDraft(normalized)
        setHomeImage((image) => (image ? { ...image, layout: normalized } : image))
    }, [])

    const hasLayoutChanges =
        JSON.stringify(layoutDraft) !== JSON.stringify(savedLayout)

    const saveLayout = useCallback(
        async () => {
            if (!hasLayoutChanges) return
            setIsLayoutSaving(true)
            try {
                const saved = await updateHomeImageLayout(getToken, layoutDraft)
                setHomeImage((image) => ({
                    ...(image ?? saved),
                    ...saved,
                    imageUrl: image?.imageUrl ?? saved.imageUrl,
                }))
                setLayoutDraft(saved.layout)
                setSavedLayout(saved.layout)
                toast.success('이미지 크기가 저장되었습니다.')
            } catch (e) {
                toast.error(e instanceof Error ? e.message : '이미지 크기 저장에 실패했습니다.')
                loadHomeImage()
            } finally {
                setIsLayoutSaving(false)
            }
        },
        [getToken, hasLayoutChanges, layoutDraft, loadHomeImage],
    )

    const processFiles = useCallback(
        async (files: FileList | null) => {
            const [imageFile] = filterImageFiles(files)
            if (!imageFile) {
                setError('이미지 파일(jpg, png, webp, gif)만 업로드할 수 있습니다.')
                return
            }

            setError(null)
            setIsSaving(true)

            let compressedFile: File
            try {
                compressedFile = await compressImageFile(imageFile)
            } catch {
                setError(`이미지 압축 실패: ${imageFile.name}`)
                setIsSaving(false)
                return
            }

            const previousImage = homeImage
            const previewUrl = URL.createObjectURL(compressedFile)
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
            previewUrlRef.current = previewUrl
            setHomeImage({
                imageKey: 'home/main.webp',
                imageUrl: previewUrl,
                alt: previousImage?.alt ?? 'Arfin Yoon main image',
                updatedAt: new Date().toISOString(),
                layout: layoutDraft,
            })

            try {
                const nextImage = await uploadHomeImage(
                    getToken,
                    compressedFile,
                    previousImage?.alt,
                    layoutDraft,
                )
                setHomeImage(nextImage)
                setLayoutDraft(nextImage.layout)
                setSavedLayout(nextImage.layout)
                toast.success('홈 대표 이미지가 저장되었습니다.')
                setIsDialogOpen(false)
            } catch (e) {
                setHomeImage(previousImage)
                toast.error(e instanceof Error ? e.message : '홈 대표 이미지 저장에 실패했습니다.')
            } finally {
                setIsSaving(false)
                if (previewUrlRef.current) {
                    URL.revokeObjectURL(previewUrlRef.current)
                    previewUrlRef.current = null
                }
            }
        },
        [getToken, homeImage, layoutDraft],
    )

    const headerAction = (
        <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <Upload className="mr-2 h-4 w-4" />
                        업로드
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>업로드</DialogTitle>
                        <DialogDescription>
                            업로드 시 WebP로 변환되고 긴 변은 최대 1920px로 조정됩니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div
                            onDrop={(e) => {
                                e.preventDefault()
                                setIsDragging(false)
                                processFiles(e.dataTransfer.files)
                            }}
                            onDragOver={(e) => {
                                e.preventDefault()
                                setIsDragging(true)
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault()
                                setIsDragging(false)
                            }}
                            className={cn(
                                'relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
                                isDragging
                                    ? 'border-primary bg-primary/5'
                                    : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50',
                            )}
                        >
                            <input
                                type="file"
                                accept={ACCEPTED_IMAGE_MIME_TYPES}
                                className="absolute inset-0 cursor-pointer opacity-0"
                                onChange={(e) => {
                                    processFiles(e.target.files)
                                    e.target.value = ''
                                }}
                                disabled={isSaving}
                                aria-label="홈 대표 이미지 선택"
                            />
                            <div className="mb-3 rounded-full bg-muted p-4">
                                <ImageUp className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="text-center text-sm font-medium">
                                파일을 드래그하거나 클릭하여 선택
                            </p>
                            <p className="mt-1 text-center text-xs text-muted-foreground">
                                {ACCEPTED_IMAGE_EXTENSIONS} 지원
                            </p>
                        </div>
                        {error ? (
                            <div
                                className="rounded-lg border border-destructive/50 bg-destructive/5 p-4"
                                role="alert"
                            >
                                <p className="text-sm font-medium text-destructive">{error}</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-3"
                                    onClick={loadHomeImage}
                                >
                                    다시 불러오기
                                </Button>
                            </div>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => signOut()}>
                로그아웃
            </Button>
        </div>
    )

    if (isAuthLoading || !user || !isAllowed || isLoading) {
        return (
            <AdminManagementLayout>
                <div className="h-[360px] animate-pulse rounded-lg bg-muted" />
            </AdminManagementLayout>
        )
    }

    const imageUrl = homeImage?.imageUrl ?? '/main.jpg'

    const centerContent = (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border bg-background p-0.5">
                    <button
                        type="button"
                        onClick={() => setPreviewMode('pc')}
                        className={cn(
                            'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                            previewMode === 'pc'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-muted',
                        )}
                        title="PC 보기"
                    >
                        <Monitor className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setPreviewMode('mobile')}
                        className={cn(
                            'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                            previewMode === 'mobile'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-muted',
                        )}
                        title="모바일 보기"
                    >
                        <Smartphone className="h-3.5 w-3.5" />
                    </button>
                </div>

                <div className="inline-flex rounded-lg border bg-background p-0.5">
                    {LAYOUT_OPTIONS.map((option) => (
                        <button
                            key={option.layout.preset}
                            type="button"
                            onClick={() => {
                                applyLayoutDraft(option.layout)
                                setIsCustomOpen(false)
                            }}
                            className={cn(
                                'rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors',
                                layoutDraft.preset === option.layout.preset &&
                                'bg-primary text-primary-foreground shadow-sm',
                            )}
                        >
                            {option.label === '작게' ? 'S' :
                                option.label === '기본' ? 'M' :
                                    option.label === '넓게' ? 'L' :
                                        option.label === '크게' ? 'XL' : option.label}
                        </button>
                    ))}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                applyLayoutDraft({
                                    ...layoutDraft,
                                    preset: 'custom',
                                })
                                setIsCustomOpen((open) => !open)
                            }}
                            className={cn(
                                'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors',
                                layoutDraft.preset === 'custom' &&
                                'bg-primary text-primary-foreground shadow-sm',
                            )}
                        >
                            <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        {isCustomOpen ? (
                            <div className="absolute right-0 top-full z-[100] mt-2 w-[240px] rounded-lg border bg-background p-4 shadow-lg">
                                <div className="grid gap-4">
                                    <SizeControl
                                        label="데스크톱 비율"
                                        description={
                                            <>
                                                <u className="decoration-muted-foreground/50 underline-offset-2">
                                                    화면이 최대 사이즈보다 작을 때
                                                </u>{' '}
                                                적용되는 비율입니다. 화면 너비에 맞춰 유동적으로 조절됩니다.
                                            </>
                                        }
                                        value={layoutDraft.desktopWidthPercent}
                                        min={30}
                                        max={95}
                                        unit="%"
                                        onChange={(value) =>
                                            applyLayoutDraft({
                                                ...layoutDraft,
                                                preset: 'custom',
                                                desktopWidthPercent: value,
                                            })
                                        }
                                    />
                                    <SizeControl
                                        label="데스크톱 너비"
                                        description={
                                            <>
                                                <u className="decoration-muted-foreground/50 underline-offset-2">
                                                    화면이 설정된 너비보다 클 때
                                                </u>{' '}
                                                적용되는 최대 너비입니다. 이미지가 이 설정값보다 커지지 않게 제한합니다.
                                            </>
                                        }
                                        value={layoutDraft.maxWidth}
                                        min={420}
                                        max={1920}
                                        step={20}
                                        unit="px"
                                        onChange={(value) =>
                                            applyLayoutDraft({
                                                ...layoutDraft,
                                                preset: 'custom',
                                                maxWidth: value,
                                            })
                                        }
                                    />
                                    <SizeControl
                                        label="모바일 비율"
                                        description="모바일 화면 너비에 대한 이미지의 상대적 크기입니다."
                                        value={layoutDraft.mobileWidthPercent}
                                        min={420}
                                        max={1920}
                                        step={20}
                                        unit="px"
                                        onChange={(value) =>
                                            applyLayoutDraft({
                                                ...layoutDraft,
                                                preset: 'custom',
                                                maxWidth: value,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>

                <Button
                    size="sm"
                    variant={hasLayoutChanges ? "default" : "outline"}
                    onClick={saveLayout}
                    disabled={isLayoutSaving || !hasLayoutChanges}
                    className="h-8 px-3"
                >
                    {isLayoutSaving ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                        <>
                            <Save className="mr-1.5 h-3.5 w-3.5" />
                            <span className="text-xs">저장</span>
                        </>
                    )}
                </Button>
            </div>
        </div>
    )

    return (
        <AdminManagementLayout headerAction={headerAction} centerContent={centerContent}>
            <div className="relative flex h-[calc(100dvh-9rem)] items-center justify-center rounded-xl bg-muted/10 p-4 transition-all duration-300">
                <div
                    className={cn(
                        'relative flex flex-col items-center overflow-hidden transition-all duration-500 ease-in-out',
                        'pointer-events-none select-none',
                        previewMode === 'mobile'
                            ? 'h-[667px] w-[375px] rounded-[3rem] border-[12px] border-slate-950 bg-background shadow-[0_0_0_2px_rgba(255,255,255,0.1),0_20px_50px_-12px_rgba(0,0,0,0.5)]'
                            : 'h-full w-full rounded-xl border bg-background shadow-2xl',
                    )}
                >
                    {/* Mac/Safari Browser Header (PC Mode) */}
                    {previewMode === 'pc' && (
                        <div className="flex w-full flex-shrink-0 items-center gap-2 border-b bg-muted/50 px-4 py-3">
                            <div className="flex gap-1.5">
                                <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                                <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                                <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
                            </div>
                            <div className="mx-auto flex h-6 w-full max-w-md items-center justify-center rounded bg-background px-3 text-[10px] text-muted-foreground shadow-sm">
                                arfin-yoon.com
                            </div>
                            <div className="w-12" /> {/* Spacer */}
                        </div>
                    )}

                    {/* Mobile Notch/Speaker (Mobile Mode) */}
                    {previewMode === 'mobile' && (
                        <div className="absolute top-0 z-[60] h-6 w-32 flex-shrink-0 rounded-b-2xl bg-slate-950">
                            <div className="absolute left-1/2 top-2 h-1 w-8 -translate-x-1/2 rounded-full bg-slate-800" />
                        </div>
                    )}

                    {/* Simulated Nav - Covers the entire viewport to allow top/bottom positioning */}
                    <div className={cn(
                        "absolute inset-x-0 bottom-0 z-50 pointer-events-none",
                        previewMode === 'pc' ? "top-[48px]" : "top-0"
                    )}>
                        <Nav isPreview forceMode={previewMode} className="!absolute !inset-0 !w-full !h-full" />
                    </div>

                    <div
                        className={cn(
                            'flex w-full items-center overflow-y-auto',
                            previewMode === 'mobile' ? 'h-full pt-20 pb-24' : 'h-full pt-[4rem]',
                        )}
                    >
                        <HomeImageRenderer
                            src={imageUrl}
                            alt={homeImage?.alt ?? 'Arfin Yoon main image'}
                            layout={layoutDraft}
                            forceMode={previewMode}
                            className="transition-[width,max-width] duration-200"
                        />
                    </div>
                </div>
                {isSaving ? (
                    <div
                        className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-[1px]"
                        aria-busy="true"
                        aria-label="저장 중"
                    >
                        <div
                            className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
                            aria-hidden
                        />
                    </div>
                ) : null}
            </div>
        </AdminManagementLayout>
    )
}

function SizeControl({
    label,
    description,
    value,
    min,
    max,
    step = 1,
    unit,
    onChange,
}: {
    label: string
    description?: React.ReactNode
    value: number
    min: number
    max: number
    step?: number
    unit: string
    onChange: (value: number) => void
}) {
    return (
        <div className="space-y-2">
            <label className="space-y-1.5 text-sm">
                <span className="flex items-center justify-between gap-3 text-muted-foreground">
                    {label}
                    <span className="font-medium text-foreground">
                        {value}
                        {unit}
                    </span>
                </span>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="w-full accent-primary"
                />
            </label>
            {description && (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {description}
                </p>
            )}
        </div>
    )
}
