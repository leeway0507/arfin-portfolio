'use client'

import { useEffect, useMemo, useState } from 'react'
import { LoaderCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { buildR2ImageUrl } from '@/lib/apis/image-url'
import type {
    PhotographAssetManagementUpdate,
    PhotographImageMetadata,
    PhotographProjectMetadata,
} from '@/lib/apis/photographs/types'
import { cn } from '@/lib/utils'
import {
    createPhotographAssetManagementDraft,
    createPhotographAssetManagementUpdate,
    getPhotographAssetManagementState,
    getPhotographAssetUsage,
    togglePhotographAssetDeletion,
    updatePhotographAssetAlt,
    type PhotographAssetManagementDraft,
    type PhotographAssetManagementState,
    type PhotographAssetUsage,
} from '../lib/photograph-asset-management-state'

interface PhotographAssetManageDialogProps {
    sectionId: string | null
    project: PhotographProjectMetadata | null
    isOpen: boolean
    isManagingAssets: boolean
    isConflict: boolean
    onClose: () => void
    onManageAssets: (update: PhotographAssetManagementUpdate) => Promise<boolean>
    onReloadPhotographs: () => void
}

export function PhotographAssetManageDialog({
    sectionId,
    project,
    isOpen,
    isManagingAssets,
    isConflict,
    onClose,
    onManageAssets,
    onReloadPhotographs,
}: PhotographAssetManageDialogProps) {
    const [draft, setDraft] = useState<PhotographAssetManagementDraft | null>(null)

    useEffect(() => {
        if (isOpen && project) setDraft(createPhotographAssetManagementDraft(project))
    }, [isOpen, project])

    const managementState = useMemo(
        () => (project && draft ? getPhotographAssetManagementState(project, draft) : null),
        [draft, project],
    )
    if (!project || !sectionId || !draft || !managementState) return null

    const handleDialogOpenChange = (open: boolean) => {
        if (open || isManagingAssets || managementState.hasChanges) return
        onClose()
    }

    const handleSaveAssetChanges = async () => {
        if (
            !managementState.hasChanges ||
            !managementState.isValid ||
            isManagingAssets ||
            isConflict
        ) {
            return
        }
        const didSave = await onManageAssets(
            createPhotographAssetManagementUpdate(sectionId, project, draft),
        )
        if (didSave) onClose()
    }

    const handleCancel = () => {
        setDraft(createPhotographAssetManagementDraft(project))
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
            <DialogContent
                className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0"
                onEscapeKeyDown={(event) =>
                    (isManagingAssets || managementState.hasChanges) && event.preventDefault()
                }
                onInteractOutside={(event) => event.preventDefault()}
                onCloseAutoFocus={(event) => {
                    event.preventDefault()
                    document.getElementById('photograph-asset-management-trigger')?.focus()
                }}
            >
                <DialogHeader className="shrink-0 border-b px-6 py-5 pr-12">
                    <DialogTitle>이미지 관리</DialogTitle>
                    <DialogDescription>
                        {project.title}의 이미지 설명을 수정하거나 R2 파일을 실제로 삭제합니다.
                    </DialogDescription>
                </DialogHeader>
                <PhotographAssetManagementBody
                    project={project}
                    draft={draft}
                    managementState={managementState}
                    isManagingAssets={isManagingAssets}
                    onChangeDraft={setDraft}
                />
                <PhotographAssetManagementFooter
                    managementState={managementState}
                    isManagingAssets={isManagingAssets}
                    isConflict={isConflict}
                    onCancel={handleCancel}
                    onSaveAssetChanges={handleSaveAssetChanges}
                    onReloadPhotographs={onReloadPhotographs}
                />
            </DialogContent>
        </Dialog>
    )
}

function PhotographAssetManagementBody({
    project,
    draft,
    managementState,
    isManagingAssets,
    onChangeDraft,
}: {
    project: PhotographProjectMetadata
    draft: PhotographAssetManagementDraft
    managementState: PhotographAssetManagementState
    isManagingAssets: boolean
    onChangeDraft: (draft: PhotographAssetManagementDraft) => void
}) {
    return (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
            <p className="mb-4 text-xs leading-5 text-muted-foreground">
                삭제 선택한 이미지는 하단 영역에서도 제거되고, 다른 소주제가 사용하지 않는 경우 R2
                파일까지 정리됩니다. 상단 이미지는 먼저 교체해야 삭제할 수 있습니다.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 min-[1280px]:grid-cols-3">
                {project.images.map((image, imageIndex) => (
                    <PhotographAssetManagementCard
                        key={image.id}
                        project={project}
                        image={image}
                        imageIndex={imageIndex}
                        alt={draft.altsByImageId[image.id]}
                        isDeleted={draft.deletedImageIds.includes(image.id)}
                        isInvalid={managementState.firstInvalidImageId === image.id}
                        isManagingAssets={isManagingAssets}
                        onChangeAlt={(alt) =>
                            onChangeDraft(updatePhotographAssetAlt(draft, image.id, alt))
                        }
                        onToggleDeletion={() =>
                            onChangeDraft(togglePhotographAssetDeletion(project, draft, image.id))
                        }
                    />
                ))}
            </div>
        </div>
    )
}

function PhotographAssetManagementCard({
    project,
    image,
    imageIndex,
    alt,
    isDeleted,
    isInvalid,
    isManagingAssets,
    onChangeAlt,
    onToggleDeletion,
}: {
    project: PhotographProjectMetadata
    image: PhotographImageMetadata
    imageIndex: number
    alt: string
    isDeleted: boolean
    isInvalid: boolean
    isManagingAssets: boolean
    onChangeAlt: (alt: string) => void
    onToggleDeletion: () => void
}) {
    const usage = getPhotographAssetUsage(project, image.id)
    const isHero = usage.includes('hero')
    const descriptionId = `asset-management-description-${image.id}`
    const errorId = `asset-management-error-${image.id}`

    return (
        <article
            className={cn(
                'overflow-hidden rounded-lg border bg-background transition-opacity',
                isDeleted && 'opacity-55',
            )}
        >
            <div className="relative h-40 bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={buildR2ImageUrl(image.objectKey)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                />
                <span className="absolute left-2 top-2 rounded bg-black/75 px-2 py-1 text-[10px] font-medium text-white">
                    {imageIndex + 1}
                </span>
            </div>
            <div className="grid gap-3 p-4">
                <PhotographAssetUsageBadges usage={usage} />
                <label
                    className="grid gap-1.5 text-xs font-medium"
                    htmlFor={`asset-alt-${image.id}`}
                >
                    이미지 설명(alt)
                    <textarea
                        id={`asset-alt-${image.id}`}
                        value={alt}
                        rows={3}
                        maxLength={240}
                        disabled={isDeleted || isManagingAssets}
                        aria-invalid={isInvalid}
                        aria-describedby={isInvalid ? errorId : undefined}
                        onChange={(event) => onChangeAlt(event.target.value)}
                        className="min-h-20 resize-y rounded-md border bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50"
                    />
                </label>
                {isInvalid ? (
                    <p id={errorId} className="text-xs text-destructive" role="alert">
                        1자 이상 240자 이하로 입력해 주세요.
                    </p>
                ) : null}
                <label
                    className={cn(
                        'flex items-start gap-2 rounded-md border p-3 text-xs',
                        isHero
                            ? 'cursor-not-allowed text-muted-foreground'
                            : 'cursor-pointer border-destructive/30 text-destructive',
                    )}
                >
                    <input
                        type="checkbox"
                        checked={isDeleted}
                        disabled={isHero || isManagingAssets}
                        aria-describedby={descriptionId}
                        onChange={onToggleDeletion}
                        className="mt-0.5 size-4"
                    />
                    <span id={descriptionId}>
                        {isHero
                            ? '상단 이미지는 교체한 뒤 실제 삭제할 수 있습니다.'
                            : 'R2 파일 실제 삭제 대상으로 선택'}
                    </span>
                </label>
            </div>
        </article>
    )
}

function PhotographAssetUsageBadges({ usage }: { usage: PhotographAssetUsage[] }) {
    return (
        <div className="flex flex-wrap gap-1.5" aria-label="이미지 사용 위치">
            {usage.map((item) => (
                <span
                    key={item}
                    className={cn(
                        'rounded-full px-2 py-1 text-[10px] font-semibold',
                        item === 'hero' && 'bg-black text-white',
                        item === 'gallery' && 'bg-blue-100 text-blue-800',
                        item === 'unused' && 'bg-neutral-100 text-neutral-600',
                    )}
                >
                    {getPhotographAssetUsageLabel(item)}
                </span>
            ))}
        </div>
    )
}

function PhotographAssetManagementFooter({
    managementState,
    isManagingAssets,
    isConflict,
    onCancel,
    onSaveAssetChanges,
    onReloadPhotographs,
}: {
    managementState: PhotographAssetManagementState
    isManagingAssets: boolean
    isConflict: boolean
    onCancel: () => void
    onSaveAssetChanges: () => void
    onReloadPhotographs: () => void
}) {
    return (
        <footer className="shrink-0 border-t bg-background px-6 py-4">
            {isConflict ? (
                <PhotographAssetManagementConflictNotice
                    onReloadPhotographs={onReloadPhotographs}
                />
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-medium">
                        alt {managementState.editedAltCount}개 수정 · 이미지{' '}
                        {managementState.deletedImageCount}개 삭제
                    </p>
                    {!managementState.isValid ? (
                        <p className="mt-1 text-xs text-destructive">
                            비어 있거나 너무 긴 이미지 설명을 확인해 주세요.
                        </p>
                    ) : (
                        <p className="mt-1 text-xs text-muted-foreground">
                            저장하면 변경사항이 포트폴리오에 즉시 반영됩니다.
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={isManagingAssets}
                        onClick={onCancel}
                    >
                        취소
                    </Button>
                    <Button
                        type="button"
                        disabled={
                            !managementState.hasChanges ||
                            !managementState.isValid ||
                            isManagingAssets ||
                            isConflict
                        }
                        onClick={onSaveAssetChanges}
                    >
                        {isManagingAssets ? (
                            <LoaderCircle className="animate-spin" aria-hidden="true" />
                        ) : (
                            <Trash2 aria-hidden="true" />
                        )}
                        변경사항 저장
                    </Button>
                </div>
            </div>
        </footer>
    )
}

function PhotographAssetManagementConflictNotice({
    onReloadPhotographs,
}: {
    onReloadPhotographs: () => void
}) {
    return (
        <div
            className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3"
            role="alert"
        >
            <p className="text-xs font-medium text-destructive">
                다른 곳에서 먼저 변경되었습니다. 최신 상태를 불러오면 현재 이미지 편집은
                초기화됩니다.
            </p>
            <Button type="button" size="sm" variant="outline" onClick={onReloadPhotographs}>
                최신 상태로 다시 불러오기
            </Button>
        </div>
    )
}

function getPhotographAssetUsageLabel(usage: PhotographAssetUsage): string {
    if (usage === 'hero') return '상단'
    if (usage === 'gallery') return '하단'
    return '미사용'
}
