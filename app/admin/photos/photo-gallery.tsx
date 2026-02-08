'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PhotoListItem } from '@/lib/apis/photos/types'
import {
    deletePhoto,
    reorderPhotos,
    updateCaption,
    orderToPhotoList,
    captionFromFilename,
} from '@/lib/apis/photos/api'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { twMerge } from 'tailwind-merge'
import { toast } from 'sonner'
import { Hash, GripVertical, Pencil, Trash2 } from 'lucide-react'

type PhotoGalleryProps = {
    photos: PhotoListItem[]
    /** 목록 갱신. 서버 응답 order로 변환한 PhotoListItem[] 전달 시 로컬 상태만 갱신(리패치 없음) */
    onPhotosChange: (updatedPhotos: PhotoListItem[]) => void
    getToken: () => Promise<string | null>
    className?: string
}

function SortablePhotoItem({
    photo,
    onDeleteClick,
    onEditCaptionClick,
    onImageLoad,
}: {
    photo: PhotoListItem
    onDeleteClick: () => void
    onEditCaptionClick: () => void
    onImageLoad?: () => void
}) {
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
            className={twMerge(
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

                {/* 업로드/삭제 대기 중: 썸네일 위 로딩 오버레이 */}
                {(photo.isPendingUpload || photo.isDeleting) ? (
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

                {/* Hover Overlay */}
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

const SkeletonGallery = ({ count = 8 }: { count?: number }) => (
    <div className="flex flex-wrap gap-2 sm:gap-4" aria-busy="true">
        {Array.from({ length: count }, (_, i) => (
            <div
                key={i}
                className="h-[100px] w-[75px] rounded-lg bg-muted animate-pulse sm:h-[240px] sm:w-[180px]"
            />
        ))}
    </div>
)

/** 관리자용 사진 갤러리: 삭제, 순서 변경(Dnd), 캡션 수정 지원 */
export function PhotoGallery({ photos, onPhotosChange, getToken, className }: PhotoGalleryProps) {
    const [deleteTarget, setDeleteTarget] = useState<PhotoListItem | null>(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [captionEditTarget, setCaptionEditTarget] = useState<PhotoListItem | null>(null)
    const [captionDraft, setCaptionDraft] = useState('')
    const [loadedCount, setLoadedCount] = useState(0)
    // 초기 로드일 때만 전체 스켈레톤. 추가 시에는 기존 이미지 유지(깜빡임 방지)
    const showFullSkeleton = photos.length > 0 && loadedCount === 0
    const prevPhotoCountRef = useRef(0)
    // 목록 구성(파일명 집합)이 바뀔 때만 리셋. 순서만 바뀌면 리셋하지 않아 reorder 후 스켈레톤이 다시 안 뜸
    const photoSetKey = [...photos.map((p) => p.filename)].sort().join(',')

    useEffect(() => {
        const prevCount = prevPhotoCountRef.current
        prevPhotoCountRef.current = photos.length

        setLoadedCount((prev) => {
            // 삭제 등: 길이만 조정
            if (photos.length <= prev) {
                return photos.length
            }
            // 목록이 늘어남(낙관적 업로드 등): 기존 이미지는 onLoad가 다시 안 뜸 → 이미 로드된 개수 유지
            return prevCount
        })
    }, [photoSetKey, photos.length])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 3 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    )

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event
            if (!over || active.id === over.id) return

            const activeId = active.id as string
            const overId = over.id as string
            const oldIndex = photos.findIndex((p) => p.filename === activeId)
            const newIndex = photos.findIndex((p) => p.filename === overId)
            if (oldIndex === -1 || newIndex === -1) return

            const reordered = arrayMove(photos, oldIndex, newIndex)
            const withNewOrder: PhotoListItem[] = reordered.map((p, i) => ({ ...p, order: i }))

            onPhotosChange(withNewOrder)

            const result = await reorderPhotos(
                getToken,
                reordered.map((p) => p.filename),
            )

            if (!result.success) {
                onPhotosChange(photos)
                toast.error(result.error ?? '순서 변경에 실패했습니다.')
            } else {
                if (Array.isArray(result.order)) {
                    onPhotosChange(orderToPhotoList(result.order))
                }
                toast.success('순서가 저장되었습니다.')
            }
        },
        [photos, getToken, onPhotosChange],
    )

    const handleDeleteConfirm = useCallback(async () => {
        if (!deleteTarget) return

        const targetFilename = deleteTarget.filename
        const originalPhotos = photos

        setDeleteError(null)
        setDeleteTarget(null)
        // 목록에서 바로 제거하지 않고, 해당 사진에만 삭제 중 오버레이 표시
        onPhotosChange(
            photos.map((p) =>
                p.filename === targetFilename ? { ...p, isDeleting: true } : p,
            ),
        )

        const result = await deletePhoto(getToken, targetFilename)

        if (result.success) {
            if (Array.isArray(result.order)) {
                onPhotosChange(orderToPhotoList(result.order))
            }
            toast.success('사진이 삭제되었습니다.')
        } else {
            onPhotosChange(originalPhotos)
            toast.error(result.error ?? '삭제에 실패했습니다.')
        }
    }, [deleteTarget, getToken, onPhotosChange, photos])

    const handleDeleteCancel = useCallback(() => {
        setDeleteTarget(null)
        setDeleteError(null)
    }, [])

    const openCaptionEdit = useCallback((photo: PhotoListItem) => {
        setCaptionEditTarget(photo)
        setCaptionDraft(photo.caption)
    }, [])

    const handleCaptionSave = useCallback(async () => {
        if (!captionEditTarget) return
        const filename = captionEditTarget.filename
        const newCaption =
            captionDraft.trim() || captionFromFilename(captionEditTarget.filename)
        const originalPhotos = photos

        // 낙관적 업데이트: 즉시 목록 반영 후 모달 닫기
        onPhotosChange(
            photos.map((p) =>
                p.filename === filename ? { ...p, caption: newCaption } : p,
            ),
        )
        setCaptionEditTarget(null)

        const result = await updateCaption(getToken, filename, captionDraft.trim())

        if (result.success) {
            toast.success('캡션이 저장되었습니다.')
        } else {
            onPhotosChange(originalPhotos)
            toast.error(result.error ?? '캡션 저장에 실패했습니다.')
        }
    }, [captionEditTarget, captionDraft, getToken, onPhotosChange, photos])

    const handleCaptionCancel = useCallback(() => {
        setCaptionEditTarget(null)
        setCaptionDraft('')
    }, [])

    return (
        <div className={className}>
            {photos.length === 0 ? (
                <div className="rounded-lg border border-dashed p-12 text-center">
                    <p className="text-muted-foreground">표시할 사진이 없습니다.</p>
                </div>
            ) : (
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
                                    <SkeletonGallery count={photos.length} />
                                </div>
                            )}
                            <div
                                className={twMerge(
                                    'flex flex-wrap gap-2 sm:gap-4 transition-opacity duration-200',
                                    showFullSkeleton && 'opacity-0',
                                )}
                            >
                                {photos.map((photo) => (
                                    <SortablePhotoItem
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
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && handleDeleteCancel()}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-5 w-5" />
                            사진 삭제
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            정말로 이 사진을 삭제하시겠습니까? <br />
                            <span className="font-semibold text-foreground">
                                &quot;{deleteTarget?.caption}&quot;
                            </span>{' '}
                            사진이 영구적으로 삭제되며 복구할 수 없습니다.
                        </DialogDescription>
                    </DialogHeader>
                    {deleteError && (
                        <div className="rounded-md bg-destructive/10 p-3">
                            <p className="text-sm font-medium text-destructive">{deleteError}</p>
                        </div>
                    )}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={handleDeleteCancel}>
                            취소
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            className="min-w-[80px]"
                        >
                            삭제
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Caption Edit Dialog */}
            <Dialog open={!!captionEditTarget} onOpenChange={(open) => !open && handleCaptionCancel()}>
                <DialogContent className="sm:max-w-[425px]">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            handleCaptionSave()
                        }}
                    >
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Pencil className="h-5 w-5" />
                                캡션 수정
                            </DialogTitle>
                            <DialogDescription>
                                포트폴리오에 표시되는 캡션을 수정합니다. 비우면 파일명 기반으로 표시됩니다.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-2 py-2">
                            <label htmlFor="caption-edit" className="text-sm font-medium leading-none">
                                캡션
                            </label>
                            <input
                                id="caption-edit"
                                type="text"
                                value={captionDraft}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setCaptionDraft(e.target.value)
                                }
                                placeholder={captionEditTarget ? captionEditTarget.filename : ''}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="ghost" onClick={handleCaptionCancel}>
                                취소
                            </Button>
                            <Button type="submit" className="min-w-[80px]">
                                저장
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
