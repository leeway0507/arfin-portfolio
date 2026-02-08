'use client'

import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { PhotoGallery } from './components/photo-gallery'
import { PhotoUploadDialog } from './components/photo-upload-dialog'
import { usePhotoManagement } from './hooks/use-photo-management'
import { PhotoManagementLayout } from './components/photo-management-layout'
import { PhotoListSkeleton } from './components/photo-list-skeleton'
import { ErrorStateView } from './components/error-state-view'
import { EmptyStateView } from './components/empty-state-view'

export default function PhotoManagementPage() {
    const {
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
    } = usePhotoManagement()

    const headerWithSignOut = (
        <Button variant="outline" onClick={() => signOut()}>
            로그아웃
        </Button>
    )

    if (isAuthLoading || !user || !isAllowed) {
        return (
            <PhotoManagementLayout title="사진 관리">
                <PhotoListSkeleton />
            </PhotoManagementLayout>
        )
    }

    if (isLoading) {
        return (
            <PhotoManagementLayout title="사진 관리">
                <PhotoListSkeleton />
            </PhotoManagementLayout>
        )
    }

    if (error) {
        return (
            <PhotoManagementLayout title="사진 관리" headerAction={headerWithSignOut}>
                <ErrorStateView message={error} onRetry={loadPhotos} />
            </PhotoManagementLayout>
        )
    }

    if (photos.length === 0) {
        return (
            <PhotoManagementLayout title="사진 관리" headerAction={headerWithSignOut}>
                <EmptyStateView
                    message="아직 등록된 사진이 없습니다."
                    subMessage="사진을 업로드해 보세요."
                    action={
                        <Button onClick={() => setUploadDialogOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" />
                            사진 업로드
                        </Button>
                    }
                />
                <PhotoUploadDialog
                    open={uploadDialogOpen}
                    onOpenChange={setUploadDialogOpen}
                    onPhotosUpdate={onPhotosUpdate}
                    existingFilenames={[]}
                    getToken={getToken}
                />
            </PhotoManagementLayout>
        )
    }

    return (
        <PhotoManagementLayout
            title="사진 관리"
            headerAction={
                <div className="flex gap-2">
                    <Button onClick={openUploadWithRollback}>
                        <Upload className="mr-2 h-4 w-4" />
                        사진 업로드
                    </Button>
                    {headerWithSignOut}
                </div>
            }
        >
            <PhotoUploadDialog
                open={uploadDialogOpen}
                onOpenChange={setUploadDialogOpen}
                onPhotosUpdate={onPhotosUpdate}
                existingFilenames={photos.map((p) => p.filename)}
                getToken={getToken}
            />
            <PhotoGallery photos={photos} onPhotosChange={setPhotos} getToken={getToken} />
        </PhotoManagementLayout>
    )
}
