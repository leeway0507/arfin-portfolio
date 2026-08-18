'use client'

import { useEffect, useState } from 'react'
import { LoaderCircle, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import type { PhotographSectionMetadata } from '@/lib/apis/photographs/types'
import { isPhotographSectionDeleteConfirmationValid } from '../lib/photographs-management-state'

interface PhotographSectionManageDialogProps {
    section: PhotographSectionMetadata | null
    isOpen: boolean
    isManagingSection: boolean
    isConflict: boolean
    onClose: () => void
    onRenameSection: (sectionId: string, title: string) => Promise<boolean>
    onDeleteSection: (sectionId: string) => Promise<boolean>
    onReloadPhotographs: () => void
}

export function PhotographSectionManageDialog({
    section,
    isOpen,
    isManagingSection,
    isConflict,
    onClose,
    onRenameSection,
    onDeleteSection,
    onReloadPhotographs,
}: PhotographSectionManageDialogProps) {
    if (!section) return null

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isManagingSection && onClose()}>
            <DialogContent
                className="sm:max-w-lg"
                onEscapeKeyDown={(event) => isManagingSection && event.preventDefault()}
                onInteractOutside={(event) => isManagingSection && event.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>대주제 관리</DialogTitle>
                    <DialogDescription>
                        {section.title}의 이름을 수정하거나 빈 대주제를 삭제합니다. 변경은 즉시
                        저장됩니다.
                    </DialogDescription>
                </DialogHeader>
                <PhotographSectionManageForm
                    section={section}
                    isManagingSection={isManagingSection}
                    isConflict={isConflict}
                    onRenameSection={onRenameSection}
                    onDeleteSection={onDeleteSection}
                    onManageComplete={onClose}
                    onReloadPhotographs={onReloadPhotographs}
                />
            </DialogContent>
        </Dialog>
    )
}

function PhotographSectionManageForm({
    section,
    isManagingSection,
    isConflict,
    onRenameSection,
    onDeleteSection,
    onManageComplete,
    onReloadPhotographs,
}: {
    section: PhotographSectionMetadata
    isManagingSection: boolean
    isConflict: boolean
    onRenameSection: PhotographSectionManageDialogProps['onRenameSection']
    onDeleteSection: PhotographSectionManageDialogProps['onDeleteSection']
    onManageComplete: () => void
    onReloadPhotographs: () => void
}) {
    const [title, setTitle] = useState(section.title)
    const [deleteConfirmation, setDeleteConfirmation] = useState('')

    useEffect(() => {
        setTitle(section.title)
        setDeleteConfirmation('')
    }, [section.id, section.title])

    const trimmedTitle = title.trim()
    const isRenameValid =
        trimmedTitle.length > 0 && trimmedTitle.length <= 120 && trimmedTitle !== section.title
    const isDeleteConfirmed = isPhotographSectionDeleteConfirmationValid(
        section,
        deleteConfirmation,
    )

    const handleRenameSection = async () => {
        if (!isRenameValid || isManagingSection || isConflict) return
        const didRename = await onRenameSection(section.id, trimmedTitle)
        if (didRename) onManageComplete()
    }

    const handleDeleteSection = async () => {
        if (!isDeleteConfirmed || isManagingSection || isConflict) return
        const didDelete = await onDeleteSection(section.id)
        if (didDelete) onManageComplete()
    }

    return (
        <div className="grid gap-6">
            <PhotographSectionRenameForm
                title={title}
                isRenameValid={isRenameValid}
                isManagingSection={isManagingSection}
                isFormDisabled={isManagingSection || isConflict}
                onChangeTitle={setTitle}
                onRenameSection={handleRenameSection}
            />
            <PhotographSectionDeleteDangerZone
                section={section}
                deleteConfirmation={deleteConfirmation}
                isDeleteConfirmed={isDeleteConfirmed}
                isManagingSection={isManagingSection}
                isFormDisabled={isManagingSection || isConflict}
                onChangeDeleteConfirmation={setDeleteConfirmation}
                onDeleteSection={handleDeleteSection}
            />
            {isConflict ? (
                <PhotographSectionManageConflictNotice onReloadPhotographs={onReloadPhotographs} />
            ) : null}
        </div>
    )
}

function PhotographSectionRenameForm({
    title,
    isRenameValid,
    isManagingSection,
    isFormDisabled,
    onChangeTitle,
    onRenameSection,
}: {
    title: string
    isRenameValid: boolean
    isManagingSection: boolean
    isFormDisabled: boolean
    onChangeTitle: (title: string) => void
    onRenameSection: () => void
}) {
    return (
        <section className="grid gap-3" aria-labelledby="section-rename-title">
            <div>
                <h3 id="section-rename-title" className="text-sm font-semibold">
                    대주제 이름
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                    저장하면 관리자 탭과 공개 화면 제목에 함께 반영됩니다.
                </p>
            </div>
            <label className="grid gap-1.5 text-xs font-medium">
                이름
                <input
                    autoFocus
                    value={title}
                    maxLength={120}
                    disabled={isFormDisabled}
                    onChange={(event) => onChangeTitle(event.target.value)}
                    className="h-10 rounded-md border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50"
                />
            </label>
            <Button
                type="button"
                className="justify-self-end"
                disabled={!isRenameValid || isFormDisabled}
                onClick={onRenameSection}
            >
                {isManagingSection ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                    <Save aria-hidden="true" />
                )}
                이름 저장
            </Button>
        </section>
    )
}

function PhotographSectionDeleteDangerZone({
    section,
    deleteConfirmation,
    isDeleteConfirmed,
    isManagingSection,
    isFormDisabled,
    onChangeDeleteConfirmation,
    onDeleteSection,
}: {
    section: PhotographSectionMetadata
    deleteConfirmation: string
    isDeleteConfirmed: boolean
    isManagingSection: boolean
    isFormDisabled: boolean
    onChangeDeleteConfirmation: (confirmation: string) => void
    onDeleteSection: () => void
}) {
    const hasProjects = section.projects.length > 0

    return (
        <section
            className="grid gap-3 border-t border-destructive/20 pt-5"
            aria-labelledby="section-delete-title"
        >
            <div>
                <h3 id="section-delete-title" className="text-sm font-semibold text-destructive">
                    위험 영역
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                    삭제한 대주제는 이 화면에서 복구할 수 없습니다.
                </p>
            </div>
            {hasProjects ? (
                <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                    현재 소주제가 있는 대주제는 삭제할 수 없습니다. 소주제 삭제 기능은 다음 단계에서
                    제공합니다.
                </p>
            ) : (
                <label className="grid gap-1.5 text-xs font-medium">
                    삭제하려면 <strong>{section.title}</strong>을 정확히 입력하세요.
                    <input
                        value={deleteConfirmation}
                        disabled={isFormDisabled}
                        onChange={(event) => onChangeDeleteConfirmation(event.target.value)}
                        className="h-10 rounded-md border border-destructive/40 bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-50"
                    />
                </label>
            )}
            <Button
                type="button"
                variant="destructive"
                className="justify-self-end"
                disabled={hasProjects || !isDeleteConfirmed || isFormDisabled}
                onClick={onDeleteSection}
            >
                {isManagingSection ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                    <Trash2 aria-hidden="true" />
                )}
                대주제 삭제
            </Button>
        </section>
    )
}

function PhotographSectionManageConflictNotice({
    onReloadPhotographs,
}: {
    onReloadPhotographs: () => void
}) {
    return (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3" role="alert">
            <p className="text-xs font-medium text-destructive">
                다른 곳에서 먼저 변경되었습니다. 입력값은 유지했으니 최신 내용을 다시 불러온 뒤
                확인해 주세요.
            </p>
            <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={onReloadPhotographs}
            >
                최신 내용 다시 불러오기
            </Button>
        </div>
    )
}
