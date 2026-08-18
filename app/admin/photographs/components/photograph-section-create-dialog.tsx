'use client'

import { useState } from 'react'
import { LoaderCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import type { PhotographSectionCreation } from '@/lib/apis/photographs/types'

interface PhotographSectionCreateDialogProps {
    isOpen: boolean
    isCreatingSection: boolean
    isConflict: boolean
    onClose: () => void
    onCreateSection: (creation: PhotographSectionCreation) => Promise<boolean>
}

export function PhotographSectionCreateDialog({
    isOpen,
    isCreatingSection,
    isConflict,
    onClose,
    onCreateSection,
}: PhotographSectionCreateDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isCreatingSection && onClose()}>
            <DialogContent
                className="sm:max-w-md"
                onEscapeKeyDown={(event) => isCreatingSection && event.preventDefault()}
                onInteractOutside={(event) => isCreatingSection && event.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>대주제 추가</DialogTitle>
                    <DialogDescription>
                        Editorial, Cover처럼 프로젝트를 묶는 최상위 주제를 만듭니다.
                    </DialogDescription>
                </DialogHeader>
                <PhotographSectionCreateForm
                    isCreatingSection={isCreatingSection}
                    isConflict={isConflict}
                    onCreateSection={onCreateSection}
                    onCreateComplete={onClose}
                />
            </DialogContent>
        </Dialog>
    )
}

function PhotographSectionCreateForm({
    isCreatingSection,
    isConflict,
    onCreateSection,
    onCreateComplete,
}: {
    isCreatingSection: boolean
    isConflict: boolean
    onCreateSection: PhotographSectionCreateDialogProps['onCreateSection']
    onCreateComplete: () => void
}) {
    const [title, setTitle] = useState('')
    const isFormValid = title.trim().length > 0 && title.trim().length <= 120

    const handleCreateSection = async () => {
        if (!isFormValid || isCreatingSection || isConflict) return
        const didCreate = await onCreateSection({ title })
        if (didCreate) onCreateComplete()
    }

    return (
        <div className="grid gap-5">
            <PhotographSectionCreateTitle
                title={title}
                isFormDisabled={isCreatingSection || isConflict}
                onChangeTitle={setTitle}
            />
            <PhotographSectionCreateActions
                isFormValid={isFormValid}
                isCreatingSection={isCreatingSection}
                isConflict={isConflict}
                onCreateSection={handleCreateSection}
            />
        </div>
    )
}

function PhotographSectionCreateTitle({
    title,
    isFormDisabled,
    onChangeTitle,
}: {
    title: string
    isFormDisabled: boolean
    onChangeTitle: (title: string) => void
}) {
    return (
        <label className="grid gap-1.5 text-xs font-medium">
            대주제 이름
            <input
                autoFocus
                value={title}
                maxLength={120}
                disabled={isFormDisabled}
                onChange={(event) => onChangeTitle(event.target.value)}
                placeholder="예: Cover Highlights"
                className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50"
            />
        </label>
    )
}

function PhotographSectionCreateActions({
    isFormValid,
    isCreatingSection,
    isConflict,
    onCreateSection,
}: {
    isFormValid: boolean
    isCreatingSection: boolean
    isConflict: boolean
    onCreateSection: () => void
}) {
    return (
        <div className="border-t pt-4">
            {isConflict ? (
                <p className="mb-3 text-xs font-medium text-destructive" role="alert">
                    다른 곳에서 먼저 변경되었습니다. 최신 내용을 다시 불러온 뒤 추가해 주세요.
                </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                    생성 후 첫 소주제를 추가하면 공개 화면에 표시됩니다.
                </p>
                <Button
                    type="button"
                    disabled={!isFormValid || isCreatingSection || isConflict}
                    onClick={onCreateSection}
                >
                    {isCreatingSection ? (
                        <LoaderCircle className="animate-spin" aria-hidden="true" />
                    ) : (
                        <Plus aria-hidden="true" />
                    )}
                    {isCreatingSection ? '추가 중' : '대주제 추가'}
                </Button>
            </div>
        </div>
    )
}
