'use client'

import { useEffect, useState } from 'react'
import { LoaderCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import type { PhotographProjectMetadata } from '@/lib/apis/photographs/types'
import { isPhotographProjectDeleteConfirmationValid } from '../lib/photographs-management-state'

interface PhotographProjectManageDialogProps {
    project: PhotographProjectMetadata | null
    isOpen: boolean
    isManagingProject: boolean
    isConflict: boolean
    onClose: () => void
    onDeleteProject: (projectId: string) => Promise<boolean>
    onReloadPhotographs: () => void
}

export function PhotographProjectManageDialog({
    project,
    isOpen,
    isManagingProject,
    isConflict,
    onClose,
    onDeleteProject,
    onReloadPhotographs,
}: PhotographProjectManageDialogProps) {
    if (!project) return null

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isManagingProject && onClose()}>
            <DialogContent
                className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
                onEscapeKeyDown={(event) => isManagingProject && event.preventDefault()}
                onInteractOutside={(event) => isManagingProject && event.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>소주제 관리</DialogTitle>
                    <DialogDescription>
                        {project.title}을 포트폴리오에서 제거하고 관련 이미지를 정리합니다.
                    </DialogDescription>
                </DialogHeader>
                <PhotographProjectDeleteForm
                    project={project}
                    isManagingProject={isManagingProject}
                    isConflict={isConflict}
                    onDeleteProject={onDeleteProject}
                    onDeleteComplete={onClose}
                    onReloadPhotographs={onReloadPhotographs}
                />
            </DialogContent>
        </Dialog>
    )
}

function PhotographProjectDeleteForm({
    project,
    isManagingProject,
    isConflict,
    onDeleteProject,
    onDeleteComplete,
    onReloadPhotographs,
}: {
    project: PhotographProjectMetadata
    isManagingProject: boolean
    isConflict: boolean
    onDeleteProject: PhotographProjectManageDialogProps['onDeleteProject']
    onDeleteComplete: () => void
    onReloadPhotographs: () => void
}) {
    const [deleteConfirmation, setDeleteConfirmation] = useState('')

    useEffect(() => {
        setDeleteConfirmation('')
    }, [project.id])

    const isDeleteConfirmed = isPhotographProjectDeleteConfirmationValid(
        project,
        deleteConfirmation,
    )

    const handleDeleteProject = async () => {
        if (!isDeleteConfirmed || isManagingProject || isConflict) return
        const didDelete = await onDeleteProject(project.id)
        if (didDelete) onDeleteComplete()
    }

    return (
        <div className="grid gap-5">
            <PhotographProjectDeleteSummary project={project} />
            <PhotographProjectDeleteDangerZone
                project={project}
                deleteConfirmation={deleteConfirmation}
                isDeleteConfirmed={isDeleteConfirmed}
                isManagingProject={isManagingProject}
                isFormDisabled={isManagingProject || isConflict}
                onChangeDeleteConfirmation={setDeleteConfirmation}
                onDeleteProject={handleDeleteProject}
            />
            {isConflict ? (
                <PhotographProjectManageConflictNotice onReloadPhotographs={onReloadPhotographs} />
            ) : null}
        </div>
    )
}

function PhotographProjectDeleteSummary({ project }: { project: PhotographProjectMetadata }) {
    return (
        <dl className="grid gap-2 rounded-lg bg-muted/70 p-4 text-sm">
            <div className="grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] gap-3">
                <dt className="text-muted-foreground">매체명</dt>
                <dd className="break-words font-medium">{project.publication}</dd>
            </div>
            <div className="grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] gap-3">
                <dt className="text-muted-foreground">프로젝트</dt>
                <dd className="break-words font-medium">{project.title}</dd>
            </div>
            <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
                <dt className="text-muted-foreground">이미지</dt>
                <dd className="font-medium">{project.images.length}개 자산</dd>
            </div>
        </dl>
    )
}

function PhotographProjectDeleteDangerZone({
    project,
    deleteConfirmation,
    isDeleteConfirmed,
    isManagingProject,
    isFormDisabled,
    onChangeDeleteConfirmation,
    onDeleteProject,
}: {
    project: PhotographProjectMetadata
    deleteConfirmation: string
    isDeleteConfirmed: boolean
    isManagingProject: boolean
    isFormDisabled: boolean
    onChangeDeleteConfirmation: (confirmation: string) => void
    onDeleteProject: () => void
}) {
    return (
        <section className="grid gap-3" aria-labelledby="project-delete-title">
            <div>
                <h3 id="project-delete-title" className="text-sm font-semibold text-destructive">
                    위험 영역
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    소주제는 포트폴리오 화면에서 즉시 제거됩니다. 다른 소주제에서 사용하지 않는 WebP
                    파일도 R2에서 정리하며, 이 화면에서는 복구할 수 없습니다.
                </p>
            </div>
            <label className="grid gap-1.5 text-xs font-medium">
                삭제하려면 <strong className="break-words">{project.title}</strong>을 정확히
                입력하세요.
                <input
                    autoFocus
                    value={deleteConfirmation}
                    disabled={isFormDisabled}
                    onChange={(event) => onChangeDeleteConfirmation(event.target.value)}
                    className="h-10 rounded-md border border-destructive/40 bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-50"
                />
            </label>
            <Button
                type="button"
                variant="destructive"
                className="justify-self-end"
                disabled={!isDeleteConfirmed || isFormDisabled}
                onClick={onDeleteProject}
            >
                {isManagingProject ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                    <Trash2 aria-hidden="true" />
                )}
                소주제 삭제
            </Button>
        </section>
    )
}

function PhotographProjectManageConflictNotice({
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
