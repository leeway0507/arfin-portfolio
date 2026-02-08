'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { PhotoListItem } from '@/lib/apis/photos/types'
import {
    getPhotoList,
    orderToPhotoList,
    orderToPhotoListWithPreviews,
} from '@/lib/apis/photos/api'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { PhotoGallery } from './photo-gallery'
import { PhotoUploadDialog } from './photo-upload-dialog'

export default function PhotoManagementPage() {
    const router = useRouter()
    const { user, isLoading: isAuthLoading, isAllowed, signOut } = useAuth()
    const [photos, setPhotos] = useState<PhotoListItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
    const rollbackOrderRef = useRef<string[]>([])

    // 미인증 또는 권한 없음 → /admin 로그인 화면으로 리다이렉트
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

    const skeletonItems = [1, 2, 3, 4, 5, 6, 7, 8]
    const SkeletonGallery = () => (
        <div className="flex flex-wrap gap-2 sm:gap-4" aria-busy="true">
            {skeletonItems.map((i) => (
                <div
                    key={i}
                    className="h-[100px] w-[75px] rounded-lg bg-muted animate-pulse sm:h-[240px] sm:w-[180px]"
                />
            ))}
        </div>
    )

    // 인증 확인 중
    if (isAuthLoading || !user || !isAllowed) {
        return (
            <div className="p-8 pt-20">
                <h1 className="mb-6 text-2xl font-bold">사진 관리</h1>
                <SkeletonGallery />
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="p-8 pt-20">
                <h1 className="mb-6 text-2xl font-bold">사진 관리</h1>
                <SkeletonGallery />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-8 pt-20">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">사진 관리</h1>
                    <Button variant="outline" onClick={() => signOut()}>
                        로그아웃
                    </Button>
                </div>
                <div className="rounded-lg border border-dashed border-destructive/50 bg-destructive/5 p-12 text-center">
                    <p className="mb-4 text-muted-foreground">{error}</p>
                    <Button type="button" onClick={() => loadPhotos()}>
                        다시 시도
                    </Button>
                </div>
            </div>
        )
    }

    if (photos.length === 0) {
        return (
            <div className="p-8 pt-20">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">사진 관리</h1>
                    <Button variant="outline" onClick={() => signOut()}>
                        로그아웃
                    </Button>
                </div>
                <div className="rounded-lg border border-dashed p-12 text-center">
                    <p className="mb-2 text-muted-foreground">아직 등록된 사진이 없습니다.</p>
                    <p className="mb-4 text-sm text-muted-foreground">사진을 업로드해 보세요.</p>
                    <Button onClick={() => setUploadDialogOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        사진 업로드
                    </Button>
                </div>
                <PhotoUploadDialog
                    open={uploadDialogOpen}
                    onOpenChange={setUploadDialogOpen}
                    onOptimisticAdd={(predicted, previewUrls) => {
                        rollbackOrderRef.current = []
                        const items = orderToPhotoListWithPreviews(predicted, previewUrls).map(
                            (item) => ({ ...item, isPendingUpload: true }),
                        )
                        setPhotos(items)
                    }}
                    onSuccess={(_, order) => {
                        if (Array.isArray(order) && order.length > 0) {
                            setPhotos(orderToPhotoList(order))
                        }
                    }}
                    onRollback={() => {
                        setPhotos(orderToPhotoList(rollbackOrderRef.current))
                    }}
                    existingFilenames={[]}
                    getToken={() => user?.getIdToken() ?? Promise.resolve(null)}
                />
            </div>
        )
    }

    const existingFilenames = photos.map((p) => p.filename)

    return (
        <div className="p-8 pt-20">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold">사진 관리</h1>
                <div className="flex gap-2">
                    <Button onClick={() => setUploadDialogOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        사진 업로드
                    </Button>
                    <Button variant="outline" onClick={() => signOut()}>
                        로그아웃
                    </Button>
                </div>
            </div>

            <PhotoUploadDialog
                open={uploadDialogOpen}
                onOpenChange={setUploadDialogOpen}
                onOptimisticAdd={(predicted, previewUrls) => {
                    const prevOrder = photos.map((p) => p.filename)
                    rollbackOrderRef.current = prevOrder
                    const newItems = orderToPhotoListWithPreviews(predicted, previewUrls).map(
                        (item, i) => ({
                            ...item,
                            order: photos.length + i,
                            isPendingUpload: true,
                        }),
                    )
                    setPhotos([...photos, ...newItems])
                }}
                onSuccess={(_, order) => {
                    if (Array.isArray(order) && order.length > 0) {
                        setPhotos(orderToPhotoList(order))
                    }
                }}
                onRollback={() => {
                    setPhotos(orderToPhotoList(rollbackOrderRef.current))
                }}
                existingFilenames={existingFilenames}
                getToken={() => user?.getIdToken() ?? Promise.resolve(null)}
            />

            <PhotoGallery
                photos={photos}
                onPhotosChange={(updatedPhotos) => setPhotos(updatedPhotos)}
                getToken={() => user?.getIdToken() ?? Promise.resolve(null)}
            />
        </div>
    )
}
