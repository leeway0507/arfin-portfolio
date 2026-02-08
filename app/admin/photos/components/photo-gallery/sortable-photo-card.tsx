'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PhotoListItem } from '@/lib/apis/photos/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Hash, GripVertical, Pencil, Trash2 } from 'lucide-react'

type SortablePhotoCardProps = {
    photo: PhotoListItem
    onDeleteClick: () => void
    onEditCaptionClick: () => void
    onImageLoad?: () => void
}

export function SortablePhotoCard({
    photo,
    onDeleteClick,
    onEditCaptionClick,
    onImageLoad,
}: SortablePhotoCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: photo.filename,
        disabled: !!photo.isDeleting,
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        cursor: isDragging ? 'grabbing' : 'grab',
    }

    return (
        <article
            ref={setNodeRef}
            style={style}
            className={cn(
                'group relative flex flex-col overflow-hidden rounded-lg border border-border bg-muted transition-all hover:shadow-md touch-none',
                isDragging && 'opacity-50 z-50 ring-2 ring-primary',
            )}
            {...attributes}
            {...listeners}
        >
            <div className="relative h-[100px] w-auto overflow-hidden sm:h-[240px]">
                {photo.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={photo.imageUrl}
                        alt={photo.caption}
                        className="h-full w-auto object-contain pointer-events-none select-none"
                        onLoad={onImageLoad}
                        onError={onImageLoad}
                    />
                ) : null}

                {photo.isPendingUpload || photo.isDeleting ? (
                    <div
                        className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-[1px] pointer-events-none"
                        aria-busy="true"
                        aria-label={photo.isDeleting ? '삭제 중' : '업로드 중'}
                    >
                        <div
                            className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
                            aria-hidden
                        />
                    </div>
                ) : null}

                <div className="absolute inset-0 flex flex-col justify-between bg-black/40 p-2 opacity-0 transition-opacity group-hover:opacity-100 sm:p-3 pointer-events-none">
                    <div className="flex justify-end gap-1">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 shrink-0 shadow-sm pointer-events-auto"
                            aria-label="캡션 수정"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onEditCaptionClick()
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 shrink-0 shadow-sm pointer-events-auto"
                            aria-label="삭제"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onDeleteClick()
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="rounded bg-white/10 p-1.5 transition-colors">
                                <GripVertical className="h-4 w-4" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="truncate text-xs font-semibold sm:text-sm drop-shadow-sm text-white">
                                    {photo.caption}
                                </p>
                                <div className="flex items-center gap-0.5 text-[10px] text-white/90 sm:text-xs">
                                    <Hash className="h-3 w-3" />
                                    <span>{photo.order + 1}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    )
}
