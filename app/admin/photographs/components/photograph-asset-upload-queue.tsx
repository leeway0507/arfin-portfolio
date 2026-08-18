'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { ImagePlus, LoaderCircle, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PhotographAssetTarget, PhotographAssetUploadItem } from '@/lib/apis/photographs/types'
import { ACCEPTED_IMAGE_EXTENSIONS, ACCEPTED_IMAGE_MIME_TYPES } from '@/lib/images/compression'
import { cn } from '@/lib/utils'

interface PhotographAssetUploadQueueProps {
    mode: PhotographAssetTarget
    hasUnsavedChanges: boolean
    isUploadingAsset: boolean
    assetUploadProgress: string | null
    isConflict: boolean
    onUploadImages: (
        target: PhotographAssetTarget,
        assets: PhotographAssetUploadItem[],
    ) => Promise<boolean>
    onUploadComplete: () => void
}

interface QueuedPhotographAsset extends PhotographAssetUploadItem {
    id: string
}

interface PhotographAssetUploadQueueItemProps {
    asset: QueuedPhotographAsset
    imageIndex: number
    isEditingDisabled: boolean
    onChangeAlt: (assetId: string, alt: string) => void
    onRemoveAsset: (assetId: string) => void
}

export function PhotographAssetUploadQueue({
    mode,
    hasUnsavedChanges,
    isUploadingAsset,
    assetUploadProgress,
    isConflict,
    onUploadImages,
    onUploadComplete,
}: PhotographAssetUploadQueueProps) {
    const [queuedAssets, setQueuedAssets] = useState<QueuedPhotographAsset[]>([])
    const [selectionError, setSelectionError] = useState<string | null>(null)
    const isUploadBlocked = hasUnsavedChanges || isUploadingAsset || isConflict
    const hasInvalidAlt = queuedAssets.some((asset) => !asset.alt.trim())

    const handleSelectFiles = (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files ?? [])
        event.target.value = ''
        if (selectedFiles.length === 0) return

        const availableCount = MAX_GALLERY_UPLOAD_COUNT - queuedAssets.length
        setSelectionError(
            mode === 'gallery' && selectedFiles.length > availableCount
                ? `하단 이미지는 한 번에 최대 ${MAX_GALLERY_UPLOAD_COUNT}장까지 넣을 수 있습니다.`
                : null,
        )
        setQueuedAssets(buildNextAssetQueue(mode, queuedAssets, selectedFiles))
    }

    const handleChangeAlt = (assetId: string, alt: string) => {
        setQueuedAssets((assets) =>
            assets.map((asset) => (asset.id === assetId ? { ...asset, alt } : asset)),
        )
    }

    const handleRemoveAsset = (assetId: string) => {
        if (isUploadingAsset) return
        setQueuedAssets((assets) => assets.filter((asset) => asset.id !== assetId))
        setSelectionError(null)
    }

    const handleUploadImages = async () => {
        if (queuedAssets.length === 0 || hasInvalidAlt || isUploadBlocked) return
        const didUpload = await onUploadImages(
            mode,
            queuedAssets.map(({ file, alt }) => ({ file, alt })),
        )
        if (didUpload) onUploadComplete()
    }

    return (
        <section
            className="rounded-xl border border-dashed bg-muted/30 p-4"
            aria-labelledby="new-asset-title"
        >
            <PhotographAssetUploadPicker
                mode={mode}
                isUploadBlocked={isUploadBlocked}
                onSelectFiles={handleSelectFiles}
            />
            <PhotographAssetUploadNotices
                hasUnsavedChanges={hasUnsavedChanges}
                isConflict={isConflict}
                selectionError={selectionError}
            />
            {queuedAssets.length > 0 ? (
                <div className="mt-4 border-t pt-4">
                    <PhotographAssetUploadQueueList
                        queuedAssets={queuedAssets}
                        isEditingDisabled={isUploadingAsset || isConflict}
                        onChangeAlt={handleChangeAlt}
                        onRemoveAsset={handleRemoveAsset}
                    />
                    <PhotographAssetUploadAction
                        mode={mode}
                        assetCount={queuedAssets.length}
                        isUploadingAsset={isUploadingAsset}
                        assetUploadProgress={assetUploadProgress}
                        isDisabled={hasInvalidAlt || isUploadBlocked}
                        onUploadImages={handleUploadImages}
                    />
                </div>
            ) : null}
        </section>
    )
}

function PhotographAssetUploadPicker({
    mode,
    isUploadBlocked,
    onSelectFiles,
}: {
    mode: PhotographAssetTarget
    isUploadBlocked: boolean
    onSelectFiles: (event: ChangeEvent<HTMLInputElement>) => void
}) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
                <h3 id="new-asset-title" className="text-sm font-semibold">
                    새 이미지 업로드
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                    {mode === 'hero'
                        ? '상단은 한 장을 선택하면 기존 상단 이미지를 교체합니다.'
                        : '하단은 최대 10장을 선택 순서대로 한 번에 추가합니다.'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                    WebP · 긴 변 1920px · 약 1MB로 차례대로 최적화합니다.
                </p>
            </div>
            <label
                className={cn(
                    'inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent',
                    isUploadBlocked && 'pointer-events-none opacity-50',
                )}
            >
                <ImagePlus className="size-4" aria-hidden="true" />
                {mode === 'hero' ? '이미지 선택' : '여러 이미지 선택'}
                <input
                    type="file"
                    multiple={mode === 'gallery'}
                    accept={`${ACCEPTED_IMAGE_MIME_TYPES},${ACCEPTED_IMAGE_EXTENSIONS}`}
                    disabled={isUploadBlocked}
                    onChange={onSelectFiles}
                    className="sr-only"
                />
            </label>
        </div>
    )
}

function PhotographAssetUploadNotices({
    hasUnsavedChanges,
    isConflict,
    selectionError,
}: {
    hasUnsavedChanges: boolean
    isConflict: boolean
    selectionError: string | null
}) {
    return (
        <>
            {hasUnsavedChanges ? (
                <p className="mt-3 text-xs font-medium text-amber-700" role="status">
                    이미지는 즉시 저장됩니다. 먼저 현재 변경사항을 저장하거나 취소해 주세요.
                </p>
            ) : null}
            {isConflict ? (
                <p className="mt-3 text-xs font-medium text-destructive" role="alert">
                    다른 곳에서 변경되었습니다. 이 창을 닫고 최신 내용을 다시 불러와 주세요.
                </p>
            ) : null}
            {selectionError ? (
                <p className="mt-3 text-xs font-medium text-destructive" role="alert">
                    {selectionError}
                </p>
            ) : null}
        </>
    )
}

function PhotographAssetUploadQueueList({
    queuedAssets,
    isEditingDisabled,
    onChangeAlt,
    onRemoveAsset,
}: {
    queuedAssets: QueuedPhotographAsset[]
    isEditingDisabled: boolean
    onChangeAlt: PhotographAssetUploadQueueItemProps['onChangeAlt']
    onRemoveAsset: PhotographAssetUploadQueueItemProps['onRemoveAsset']
}) {
    return (
        <div className="grid gap-3">
            {queuedAssets.map((asset, imageIndex) => (
                <PhotographAssetUploadQueueItem
                    key={asset.id}
                    asset={asset}
                    imageIndex={imageIndex}
                    isEditingDisabled={isEditingDisabled}
                    onChangeAlt={onChangeAlt}
                    onRemoveAsset={onRemoveAsset}
                />
            ))}
        </div>
    )
}

function PhotographAssetUploadQueueItem({
    asset,
    imageIndex,
    isEditingDisabled,
    onChangeAlt,
    onRemoveAsset,
}: PhotographAssetUploadQueueItemProps) {
    const previewUrl = useImagePreviewUrl(asset.file)

    return (
        <article className="grid gap-3 rounded-lg border bg-background p-3 sm:grid-cols-[6rem_1fr_auto] sm:items-center">
            <figure className="aspect-[4/5] overflow-hidden rounded-md bg-muted">
                {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
            </figure>
            <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">
                    {imageIndex + 1}. {asset.file.name}
                </p>
                <label className="mt-2 grid gap-1.5 text-xs font-medium">
                    이미지 설명
                    <input
                        value={asset.alt}
                        maxLength={240}
                        disabled={isEditingDisabled}
                        onChange={(event) => onChangeAlt(asset.id, event.target.value)}
                        placeholder="사진에 보이는 내용을 짧게 설명해 주세요"
                        className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50"
                    />
                </label>
            </div>
            <button
                type="button"
                aria-label={`${imageIndex + 1}번째 선택 이미지 제거`}
                disabled={isEditingDisabled}
                onClick={() => onRemoveAsset(asset.id)}
                className="flex size-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50"
            >
                <Trash2 className="size-4" aria-hidden="true" />
            </button>
        </article>
    )
}

function PhotographAssetUploadAction({
    mode,
    assetCount,
    isUploadingAsset,
    assetUploadProgress,
    isDisabled,
    onUploadImages,
}: {
    mode: PhotographAssetTarget
    assetCount: number
    isUploadingAsset: boolean
    assetUploadProgress: string | null
    isDisabled: boolean
    onUploadImages: () => void
}) {
    const actionLabel = mode === 'hero' ? '상단 영역에 넣기' : `하단 영역에 넣기 (${assetCount}장)`

    return (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-xs text-muted-foreground">
                버튼을 누르면 선택한 이미지가 해당 영역에 바로 저장됩니다.
            </p>
            <Button type="button" disabled={isDisabled} onClick={onUploadImages}>
                {isUploadingAsset ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                    <Upload aria-hidden="true" />
                )}
                {isUploadingAsset ? (assetUploadProgress ?? '처리 중') : actionLabel}
            </Button>
        </div>
    )
}

function useImagePreviewUrl(file: File): string | null {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    useEffect(() => {
        const objectUrl = URL.createObjectURL(file)
        setPreviewUrl(objectUrl)
        return () => URL.revokeObjectURL(objectUrl)
    }, [file])

    return previewUrl
}

function buildNextAssetQueue(
    mode: PhotographAssetTarget,
    currentAssets: QueuedPhotographAsset[],
    selectedFiles: File[],
): QueuedPhotographAsset[] {
    if (mode === 'hero') return [createQueuedAsset(selectedFiles[0])]

    const availableCount = MAX_GALLERY_UPLOAD_COUNT - currentAssets.length
    return [...currentAssets, ...selectedFiles.slice(0, availableCount).map(createQueuedAsset)]
}

function createQueuedAsset(file: File): QueuedPhotographAsset {
    return {
        id: crypto.randomUUID(),
        file,
        alt: createDefaultImageAlt(file.name),
    }
}

function createDefaultImageAlt(filename: string): string {
    return filename
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .trim()
}

const MAX_GALLERY_UPLOAD_COUNT = 10
