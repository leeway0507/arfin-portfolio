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
    /** 업로드 실패 시 롤백용. 파일명만이 아닌 캡션 포함 전체 목록 보존 */
    const rollbackPhotosRef = useRef<PhotoListItem[]>([])
    /** success 시 낙관적 목록과 order 병합용 (캡션 유지) */
    const photosRef = useRef<PhotoListItem[]>([])

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

    useEffect(() => {
        photosRef.current = photos
    }, [photos])

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
            // 낙관적 목록과 서버 order 병합: 기존 항목은 캡션·imageUrl 유지, 새 항목만 filename 기반 생성
            const current = photosRef.current
            const merged = action.order.map((filename, index) => {
                const existing = current.find((p) => p.filename === filename)
                if (existing) {
                    return { ...existing, order: index, isPendingUpload: false }
                }
                const [newItem] = orderToPhotoList([filename])
                return { ...newItem, order: index }
            })
            setPhotos(merged)
        } else if (action.type === 'rollback') {
            setPhotos(
                rollbackPhotosRef.current.length > 0
                    ? rollbackPhotosRef.current
                    : orderToPhotoList(rollbackOrderRef.current),
            )
        }
    }, [])

    const openUploadWithRollback = useCallback(() => {
        rollbackOrderRef.current = photos.map((p) => p.filename)
        rollbackPhotosRef.current = [...photos]
        setUploadDialogOpen(true)
    }, [photos])

    const handleOptimisticAddFromUpload = useCallback(
        (predictedFilenames: string[], previewUrls?: string[]) => {
            if (photos.length === 0) {
                rollbackOrderRef.current = []
                rollbackPhotosRef.current = []
                handlePhotosUpdate({
                    type: 'optimistic',
                    predictedFilenames,
                    previewUrls,
                })
                return
            }
            const prevOrder = photos.map((p) => p.filename)
            rollbackOrderRef.current = prevOrder
            rollbackPhotosRef.current = [...photos]
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
