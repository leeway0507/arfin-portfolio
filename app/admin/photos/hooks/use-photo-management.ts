'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { PhotoListItem } from '@/lib/apis/photos/types'
import { getPhotoList, orderToPhotoList, orderToPhotoListWithPreviews } from '@/lib/apis/photos/api'
import { useAuth } from '@/hooks/use-auth'

export type PhotoUpdateAction =
    | { type: 'optimistic'; predictedFilenames: string[]; previewUrls?: string[] }
    | { type: 'success'; order: string[] }
    | { type: 'rollback' }

export function usePhotoManagement() {
    const router = useRouter()
    const { user, isLoading: isAuthLoading, isAllowed, signOut } = useAuth()
    const [photos, setPhotos] = useState<PhotoListItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
    const rollbackOrderRef = useRef<string[]>([])

    useEffect(() => {
        if (!isAuthLoading && (!user || !isAllowed)) {
            router.replace('/admin')
        }
    }, [isAuthLoading, user, isAllowed, router])

    const loadPhotos = useCallback(async () => {
        if (!user || !isAllowed) return
        setError(null)
        setIsLoading(true)
        try {
            const items = await getPhotoList(() => user.getIdToken())
            setPhotos(items)
        } catch (e) {
            console.error('사진 목록 로드 실패:', e)
            setError('목록을 불러오지 못했습니다.')
        } finally {
            setIsLoading(false)
        }
    }, [user, isAllowed])

    useEffect(() => {
        if (user && isAllowed) {
            loadPhotos()
        }
    }, [user, isAllowed, loadPhotos])

    const getToken = useCallback(() => user?.getIdToken() ?? Promise.resolve(null), [user])

    const handlePhotosUpdate = useCallback((action: PhotoUpdateAction) => {
        if (action.type === 'optimistic') {
            const items = orderToPhotoListWithPreviews(
                action.predictedFilenames,
                action.previewUrls,
            ).map((item) => ({ ...item, isPendingUpload: true }))
            rollbackOrderRef.current = []
            setPhotos(items)
        } else if (action.type === 'success' && action.order.length > 0) {
            setPhotos(orderToPhotoList(action.order))
        } else if (action.type === 'rollback') {
            setPhotos(orderToPhotoList(rollbackOrderRef.current))
        }
    }, [])

    const openUploadWithRollback = useCallback(() => {
        rollbackOrderRef.current = photos.map((p) => p.filename)
        setUploadDialogOpen(true)
    }, [photos])

    const handleOptimisticAddFromUpload = useCallback(
        (predictedFilenames: string[], previewUrls?: string[]) => {
            if (photos.length === 0) {
                rollbackOrderRef.current = []
                handlePhotosUpdate({
                    type: 'optimistic',
                    predictedFilenames,
                    previewUrls,
                })
                return
            }
            const prevOrder = photos.map((p) => p.filename)
            rollbackOrderRef.current = prevOrder
            const newItems = orderToPhotoListWithPreviews(predictedFilenames, previewUrls).map(
                (item, i) => ({
                    ...item,
                    order: photos.length + i,
                    isPendingUpload: true,
                }),
            )
            setPhotos([...photos, ...newItems])
        },
        [photos, handlePhotosUpdate],
    )

    const handleUploadSuccess = useCallback(
        (_uploaded?: string[], order?: string[]) => {
            if (Array.isArray(order) && order.length > 0) {
                handlePhotosUpdate({ type: 'success', order })
            }
        },
        [handlePhotosUpdate],
    )

    const handleUploadRollback = useCallback(() => {
        handlePhotosUpdate({ type: 'rollback' })
    }, [handlePhotosUpdate])

    const onPhotosUpdate = useCallback(
        (action: PhotoUpdateAction) => {
            if (action.type === 'optimistic') {
                handleOptimisticAddFromUpload(action.predictedFilenames, action.previewUrls)
            } else if (action.type === 'success') {
                handleUploadSuccess(undefined, action.order)
            } else {
                handleUploadRollback()
            }
        },
        [handleOptimisticAddFromUpload, handleUploadSuccess, handleUploadRollback],
    )

    return {
        photos,
        setPhotos,
        isLoading,
        error,
        isAuthLoading,
        user,
        isAllowed,
        signOut,
        loadPhotos,
        uploadDialogOpen,
        setUploadDialogOpen,
        openUploadWithRollback,
        getToken,
        onPhotosUpdate,
    }
}
