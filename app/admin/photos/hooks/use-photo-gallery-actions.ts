'use client'

import { useCallback, useState } from 'react'
import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { PhotoListItem } from '@/lib/apis/photos/types'
import {
    deletePhoto,
    reorderPhotos,
    updateCaption,
    orderToPhotoList,
    captionFromFilename,
} from '@/lib/apis/photos/api'
import { toast } from 'sonner'

export function usePhotoGalleryActions(
    photos: PhotoListItem[],
    onPhotosChange: (photos: PhotoListItem[]) => void,
    getToken: () => Promise<string | null>,
) {
    const [deleteTarget, setDeleteTarget] = useState<PhotoListItem | null>(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [captionEditTarget, setCaptionEditTarget] = useState<PhotoListItem | null>(null)
    const [captionDraft, setCaptionDraft] = useState('')

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
            const withNewOrder: PhotoListItem[] = reordered.map((p, i) => ({
                ...p,
                order: i,
            }))

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
        onPhotosChange(
            photos.map((p) => (p.filename === targetFilename ? { ...p, isDeleting: true } : p)),
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
        const newCaption = captionDraft.trim() || captionFromFilename(captionEditTarget.filename)
        const originalPhotos = photos

        onPhotosChange(
            photos.map((p) => (p.filename === filename ? { ...p, caption: newCaption } : p)),
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

    return {
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
    }
}
