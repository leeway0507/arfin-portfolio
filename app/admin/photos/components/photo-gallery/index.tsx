'use client'

import { useEffect, useRef, useState } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable'
import type { PhotoListItem } from '@/lib/apis/photos/types'
import { cn } from '@/lib/utils'
import { PhotoListSkeleton } from '../photo-list-skeleton'
import { SortablePhotoCard } from './sortable-photo-card'
import { DeleteConfirmDialog } from './delete-confirm-dialog'
import { CaptionEditDialog } from './caption-edit-dialog'
import { usePhotoGalleryActions } from '../../hooks/use-photo-gallery-actions'

type PhotoGalleryProps = {
    photos: PhotoListItem[]
    onPhotosChange: (updatedPhotos: PhotoListItem[]) => void
    getToken: () => Promise<string | null>
    className?: string
}

/** 관리자용 사진 갤러리: 삭제, 순서 변경(Dnd), 캡션 수정 지원 */
export function PhotoGallery({ photos, onPhotosChange, getToken, className }: PhotoGalleryProps) {
    const [loadedCount, setLoadedCount] = useState(0)
    const prevPhotoCountRef = useRef(0)
    const photoSetKey = [...photos.map((p) => p.filename)].sort().join(',')

    const {
        deleteTarget,
        setDeleteTarget,
        deleteError,
        captionEditTarget,
        captionDraft,
        setCaptionDraft,
        handleDragEnd,
        handleDeleteConfirm,
        handleDeleteCancel,
        openCaptionEdit,
        handleCaptionSave,
        handleCaptionCancel,
    } = usePhotoGalleryActions(photos, onPhotosChange, getToken)

    useEffect(() => {
        const prevCount = prevPhotoCountRef.current
        prevPhotoCountRef.current = photos.length
        setLoadedCount((prev) => (photos.length <= prev ? photos.length : prevCount))
    }, [photoSetKey, photos.length])

    const showFullSkeleton = photos.length > 0 && loadedCount === 0

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    )

    if (photos.length === 0) {
        return (
            <div className={className}>
                <div className="rounded-lg border border-dashed p-12 text-center">
                    <p className="text-muted-foreground">표시할 사진이 없습니다.</p>
                </div>
            </div>
        )
    }

    return (
        <div className={className}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={photos.map((p) => p.filename)}
                    strategy={rectSortingStrategy}
                >
                    <div className="relative">
                        {showFullSkeleton && (
                            <div className="absolute inset-0 z-10">
                                <PhotoListSkeleton count={photos.length} />
                            </div>
                        )}
                        <div
                            className={cn(
                                'flex flex-wrap gap-2 sm:gap-4 transition-opacity duration-200',
                                showFullSkeleton && 'opacity-0',
                            )}
                        >
                            {photos.map((photo) => (
                                <SortablePhotoCard
                                    key={photo.filename}
                                    photo={photo}
                                    onDeleteClick={() => setDeleteTarget(photo)}
                                    onEditCaptionClick={() => openCaptionEdit(photo)}
                                    onImageLoad={() =>
                                        setLoadedCount((c) => Math.min(c + 1, photos.length))
                                    }
                                />
                            ))}
                        </div>
                    </div>
                </SortableContext>
            </DndContext>

            <DeleteConfirmDialog
                open={!!deleteTarget}
                caption={deleteTarget?.caption ?? ''}
                errorMessage={deleteError}
                onClose={(confirmed) => (confirmed ? handleDeleteConfirm() : handleDeleteCancel())}
            />

            <CaptionEditDialog
                open={!!captionEditTarget}
                value={captionDraft}
                onValueChange={setCaptionDraft}
                onClose={(action) =>
                    action === 'save' ? handleCaptionSave() : handleCaptionCancel()
                }
            />
        </div>
    )
}
