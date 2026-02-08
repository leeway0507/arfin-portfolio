'use client'

import { useCallback, useState } from 'react'
import imageCompression from 'browser-image-compression'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { uploadPhotos as uploadPhotosApi, predictFilenames } from '@/lib/apis/photos/api'

const COMPRESSION_OPTIONS = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp' as const,
}

const ACCEPT_TYPES = 'image/jpeg,image/png,image/webp,image/gif'
const ACCEPT_EXT = '.jpg,.jpeg,.png,.webp,.gif'

interface PhotoUploadDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** 낙관적 업데이트: 예측 파일명 + 선택적 미리보기 URL(같은 순서). 업로드 시작 전 즉시 호출 */
    onOptimisticAdd: (predictedFilenames: string[], previewUrls?: string[]) => void
    /** 업로드 성공 시 호출. order 있으면 서버 order로 목록 갱신 */
    onSuccess: (uploadedFilenames?: string[], order?: string[]) => void
    /** 업로드 실패 시 롤백 호출 */
    onRollback: () => void
    existingFilenames: string[]
    /** Firebase ID token for API 인증 (upload 시 사용) */
    getToken: () => Promise<string | null>
}

export function PhotoUploadDialog({
    open,
    onOpenChange,
    onOptimisticAdd,
    onSuccess,
    onRollback,
    existingFilenames,
    getToken,
}: PhotoUploadDialogProps) {
    const [isDragging, setIsDragging] = useState(false)
    /** 변환(압축) 중에만 true. 변환 끝나면 스피너 해제 후 다이얼로그 닫고, 업로드는 백그라운드 + 토스트로 처리 */
    const [isConverting, setIsConverting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const processFiles = useCallback(
        async (files: FileList | null) => {
            if (!files || files.length === 0) return

            const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
            if (imageFiles.length === 0) {
                setError('이미지 파일(jpg, png, webp, gif)만 업로드할 수 있습니다.')
                return
            }

            setError(null)
            setIsConverting(true)

            const compressedFiles: File[] = []
            for (let i = 0; i < imageFiles.length; i++) {
                try {
                    const originalName = imageFiles[i].name
                    const compressed = await imageCompression(imageFiles[i], COMPRESSION_OPTIONS)
                    const stem = originalName.replace(/\.[^.]+$/, '') || 'image'
                    const correctName = `${stem}.webp`
                    const fileWithCorrectName = new File([compressed], correctName, {
                        type: 'image/webp',
                    })
                    compressedFiles.push(fileWithCorrectName)
                } catch {
                    setError(`이미지 압축 실패: ${imageFiles[i].name}`)
                    setIsConverting(false)
                    return
                }
            }

            // 변환 완료 → 스피너 끄고, 낙관적 업데이트 후 다이얼로그 닫기
            setIsConverting(false)
            const predictedFilenames = predictFilenames(compressedFiles, existingFilenames)
            const previewUrls = compressedFiles.map((f) => URL.createObjectURL(f))
            onOptimisticAdd(predictedFilenames, previewUrls)
            onOpenChange(false)

            // 업로드는 백그라운드. 완료 시 토스트 + onSuccess/onRollback
            try {
                const { results, succeeded, uploaded, order } = await uploadPhotosApi(
                    getToken,
                    compressedFiles,
                )

                if (results.some((r) => !r.success)) {
                    onRollback()
                    const failedCount = results.filter((r) => !r.success).length
                    const firstError = results.find((r) => r.error)?.error
                    toast.error(`${failedCount}개 업로드 실패: ${firstError ?? '알 수 없는 오류'}`)
                } else if (succeeded > 0) {
                    onSuccess(uploaded, order)
                    toast.success(`${succeeded}장의 사진이 업로드되었습니다.`)
                } else {
                    onRollback()
                    toast.error('업로드에 실패했습니다. 다시 시도해 주세요.')
                }
            } finally {
                previewUrls.forEach((url) => URL.revokeObjectURL(url))
            }
        },
        [existingFilenames, onOptimisticAdd, onSuccess, onRollback, onOpenChange, getToken],
    )

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            setIsDragging(false)
            processFiles(e.dataTransfer.files)
        },
        [processFiles],
    )

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            processFiles(e.target.files)
            e.target.value = ''
        },
        [processFiles],
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>사진 업로드</DialogTitle>
                    <DialogDescription>
                        이미지 파일(jpg, png, webp, gif)을 선택하거나 드래그하여 놓으세요. 업로드 시
                        자동으로 최적화됩니다.
                    </DialogDescription>
                </DialogHeader>

                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={cn(
                        'relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
                        isDragging
                            ? 'border-primary bg-primary/5'
                            : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50',
                    )}
                >
                    <input
                        type="file"
                        accept={ACCEPT_TYPES}
                        multiple
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={handleFileChange}
                        disabled={isConverting}
                        aria-label="사진 파일 선택"
                    />
                    {isConverting ? (
                        <div className="flex flex-col items-center gap-3">
                            <div
                                className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
                                aria-hidden
                            />
                            <p className="text-sm text-muted-foreground">이미지 변환 중...</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-3 rounded-full bg-muted p-4">
                                <Upload className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="text-center text-sm font-medium">
                                파일을 드래그하거나 클릭하여 선택
                            </p>
                            <p className="mt-1 text-center text-xs text-muted-foreground">
                                {ACCEPT_EXT} 지원
                            </p>
                        </>
                    )}
                </div>

                {error && (
                    <div
                        className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-center"
                        role="alert"
                    >
                        <p className="text-sm font-medium text-destructive">{error}</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                                setError(null)
                            }}
                        >
                            다시 시도
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
