'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { ImagePlus, LoaderCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import type { PhotographProjectCreation } from '@/lib/apis/photographs/types'
import { ACCEPTED_IMAGE_EXTENSIONS, ACCEPTED_IMAGE_MIME_TYPES } from '@/lib/images/compression'

type ProjectCreationInput = Omit<PhotographProjectCreation, 'sectionId'>

interface PhotographProjectCreateDialogProps {
    isOpen: boolean
    sectionTitle: string
    isCreatingProject: boolean
    isConflict: boolean
    projectCreateProgress: string | null
    onClose: () => void
    onCreateProject: (creation: ProjectCreationInput) => Promise<boolean>
}

export function PhotographProjectCreateDialog({
    isOpen,
    sectionTitle,
    isCreatingProject,
    isConflict,
    projectCreateProgress,
    onClose,
    onCreateProject,
}: PhotographProjectCreateDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isCreatingProject && onClose()}>
            <DialogContent
                className="max-h-[86vh] overflow-y-auto sm:max-w-2xl"
                onEscapeKeyDown={(event) => isCreatingProject && event.preventDefault()}
                onInteractOutside={(event) => isCreatingProject && event.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>{sectionTitle} 소주제 추가</DialogTitle>
                    <DialogDescription>
                        매체명, 프로젝트 제목과 대표 이미지로 새 소주제를 만듭니다.
                    </DialogDescription>
                </DialogHeader>
                <PhotographProjectCreateForm
                    sectionTitle={sectionTitle}
                    isCreatingProject={isCreatingProject}
                    isConflict={isConflict}
                    projectCreateProgress={projectCreateProgress}
                    onCreateProject={onCreateProject}
                    onCreateComplete={onClose}
                />
            </DialogContent>
        </Dialog>
    )
}

function PhotographProjectCreateForm({
    sectionTitle,
    isCreatingProject,
    isConflict,
    projectCreateProgress,
    onCreateProject,
    onCreateComplete,
}: {
    sectionTitle: string
    isCreatingProject: boolean
    isConflict: boolean
    projectCreateProgress: string | null
    onCreateProject: PhotographProjectCreateDialogProps['onCreateProject']
    onCreateComplete: () => void
}) {
    const [publication, setPublication] = useState('')
    const [title, setTitle] = useState('')
    const [heroFile, setHeroFile] = useState<File | null>(null)
    const [heroAlt, setHeroAlt] = useState('')
    const previewUrl = useImagePreviewUrl(heroFile)
    const isFormDisabled = isCreatingProject || isConflict
    const isFormValid = Boolean(publication.trim() && title.trim() && heroFile && heroAlt.trim())

    const handleSelectHero = (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0] ?? null
        event.target.value = ''
        setHeroFile(selectedFile)
        setHeroAlt(selectedFile ? createDefaultImageAlt(selectedFile.name) : '')
    }

    const handleCreateProject = async () => {
        if (!isFormValid || !heroFile || isCreatingProject) return
        const didCreate = await onCreateProject({
            publication,
            title,
            heroFile,
            heroAlt,
        })
        if (didCreate) onCreateComplete()
    }

    return (
        <div className="grid gap-5">
            <PhotographProjectCreateMetadata
                publication={publication}
                title={title}
                isFormDisabled={isFormDisabled}
                onChangePublication={setPublication}
                onChangeTitle={setTitle}
            />
            <PhotographProjectCreateHero
                heroFile={heroFile}
                heroAlt={heroAlt}
                previewUrl={previewUrl}
                isFormDisabled={isFormDisabled}
                onSelectHero={handleSelectHero}
                onChangeHeroAlt={setHeroAlt}
            />
            <PhotographProjectCreateActions
                sectionTitle={sectionTitle}
                isFormValid={isFormValid}
                isCreatingProject={isCreatingProject}
                isConflict={isConflict}
                projectCreateProgress={projectCreateProgress}
                onCreateProject={handleCreateProject}
            />
        </div>
    )
}

function PhotographProjectCreateMetadata({
    publication,
    title,
    isFormDisabled,
    onChangePublication,
    onChangeTitle,
}: {
    publication: string
    title: string
    isFormDisabled: boolean
    onChangePublication: (publication: string) => void
    onChangeTitle: (title: string) => void
}) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-medium">
                매체명
                <input
                    autoFocus
                    value={publication}
                    maxLength={120}
                    disabled={isFormDisabled}
                    onChange={(event) => onChangePublication(event.target.value)}
                    placeholder="예: Vogue France"
                    className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50"
                />
            </label>
            <label className="grid gap-1.5 text-xs font-medium">
                프로젝트 제목
                <input
                    value={title}
                    maxLength={120}
                    disabled={isFormDisabled}
                    onChange={(event) => onChangeTitle(event.target.value)}
                    placeholder="예: New Story"
                    className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50"
                />
            </label>
        </div>
    )
}

function PhotographProjectCreateHero({
    heroFile,
    heroAlt,
    previewUrl,
    isFormDisabled,
    onSelectHero,
    onChangeHeroAlt,
}: {
    heroFile: File | null
    heroAlt: string
    previewUrl: string | null
    isFormDisabled: boolean
    onSelectHero: (event: ChangeEvent<HTMLInputElement>) => void
    onChangeHeroAlt: (alt: string) => void
}) {
    return (
        <section className="rounded-xl border border-dashed bg-muted/30 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold">대표 이미지</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        필수 이미지 한 장이며, 최적화 후 상단 영역에 저장됩니다.
                    </p>
                </div>
                <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50">
                    <ImagePlus className="size-4" aria-hidden="true" /> 대표 이미지 선택
                    <input
                        type="file"
                        accept={`${ACCEPTED_IMAGE_MIME_TYPES},${ACCEPTED_IMAGE_EXTENSIONS}`}
                        disabled={isFormDisabled}
                        onChange={onSelectHero}
                        className="sr-only"
                    />
                </label>
            </div>
            {heroFile && previewUrl ? (
                <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-[8rem_1fr]">
                    <figure className="aspect-[4/5] overflow-hidden rounded-lg bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                    </figure>
                    <div className="min-w-0">
                        <p className="truncate text-xs text-muted-foreground">{heroFile.name}</p>
                        <label className="mt-3 grid gap-1.5 text-xs font-medium">
                            이미지 설명
                            <input
                                value={heroAlt}
                                maxLength={240}
                                disabled={isFormDisabled}
                                onChange={(event) => onChangeHeroAlt(event.target.value)}
                                placeholder="사진에 보이는 내용을 짧게 설명해 주세요"
                                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50"
                            />
                        </label>
                    </div>
                </div>
            ) : null}
        </section>
    )
}

function PhotographProjectCreateActions({
    sectionTitle,
    isFormValid,
    isCreatingProject,
    isConflict,
    projectCreateProgress,
    onCreateProject,
}: {
    sectionTitle: string
    isFormValid: boolean
    isCreatingProject: boolean
    isConflict: boolean
    projectCreateProgress: string | null
    onCreateProject: () => void
}) {
    return (
        <div className="border-t pt-4">
            {isConflict ? (
                <p className="mb-3 text-xs font-medium text-destructive" role="alert">
                    다른 곳에서 먼저 변경되었습니다. 창을 닫고 최신 내용을 다시 불러온 뒤 추가해
                    주세요.
                </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                    새 소주제는 {sectionTitle}의 마지막에 추가되며 하단 이미지는 생성 후 넣습니다.
                </p>
                <Button
                    type="button"
                    disabled={!isFormValid || isCreatingProject || isConflict}
                    onClick={onCreateProject}
                >
                    {isCreatingProject ? (
                        <LoaderCircle className="animate-spin" aria-hidden="true" />
                    ) : (
                        <Plus aria-hidden="true" />
                    )}
                    {isCreatingProject ? (projectCreateProgress ?? '처리 중') : '소주제 추가'}
                </Button>
            </div>
        </div>
    )
}

function useImagePreviewUrl(file: File | null): string | null {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null)
            return
        }
        const objectUrl = URL.createObjectURL(file)
        setPreviewUrl(objectUrl)
        return () => URL.revokeObjectURL(objectUrl)
    }, [file])

    return previewUrl
}

function createDefaultImageAlt(filename: string): string {
    return filename
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .trim()
}
