'use client'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import type { PhotographAssetTarget, PhotographAssetUploadItem } from '@/lib/apis/photographs/types'
import { PhotographAssetUploadQueue } from './photograph-asset-upload-queue'

interface PhotographAssetDialogProps {
    mode: PhotographAssetTarget | null
    hasUnsavedChanges: boolean
    isUploadingAsset: boolean
    assetUploadProgress: string | null
    isConflict: boolean
    onClose: () => void
    onUploadImages: (
        target: PhotographAssetTarget,
        assets: PhotographAssetUploadItem[],
    ) => Promise<boolean>
}

export function PhotographAssetDialog({
    mode,
    hasUnsavedChanges,
    isUploadingAsset,
    assetUploadProgress,
    isConflict,
    onClose,
    onUploadImages,
}: PhotographAssetDialogProps) {
    const isHeroDialog = mode === 'hero'

    return (
        <Dialog
            open={mode !== null}
            onOpenChange={(isOpen) => !isOpen && !isUploadingAsset && onClose()}
        >
            <DialogContent
                className="max-h-[86vh] overflow-y-auto sm:max-w-4xl"
                onEscapeKeyDown={(event) => isUploadingAsset && event.preventDefault()}
                onInteractOutside={(event) => isUploadingAsset && event.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>
                        {isHeroDialog ? '상단 이미지 교체' : '하단 이미지 업로드'}
                    </DialogTitle>
                    <DialogDescription>
                        {isHeroDialog
                            ? '새 이미지 한 장으로 상단 영역을 교체합니다. 기존 이미지는 이미지 관리에서 확인할 수 있습니다.'
                            : '새 이미지를 여러 장 선택해 하단 영역에 한 번에 넣습니다.'}
                    </DialogDescription>
                </DialogHeader>
                {mode ? (
                    <PhotographAssetUploadQueue
                        key={mode}
                        mode={mode}
                        hasUnsavedChanges={hasUnsavedChanges}
                        isUploadingAsset={isUploadingAsset}
                        assetUploadProgress={assetUploadProgress}
                        isConflict={isConflict}
                        onUploadImages={onUploadImages}
                        onUploadComplete={onClose}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    )
}
