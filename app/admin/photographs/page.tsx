'use client'

import Link from 'next/link'
import { ExternalLink, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminManagementLayout } from '../components/admin-management-layout'
import { PhotographsManagementShell } from './components/photographs-management-shell'
import { usePhotographsManagement } from './hooks/use-photographs-management'

export default function PhotographManagementPage() {
    const {
        sections,
        selectedSectionId,
        sectionTitle,
        projects,
        selectedProjectId,
        projectDraft,
        updateProjectDraft,
        hasChanges,
        hasProjectChanges,
        hasProjectOrderChanges,
        hasSectionOrderChanges,
        changeMode,
        isDraftValid,
        isLoading,
        isSaving,
        isUploadingAsset,
        isCreatingProject,
        isCreatingSection,
        isManagingProject,
        isManagingSection,
        isManagingAssets,
        assetUploadProgress,
        projectCreateProgress,
        isNavigationBlocked,
        isSectionOrderEditingDisabled,
        isProjectOrderEditingDisabled,
        isConflict,
        error,
        isAuthLoading,
        user,
        isAllowed,
        signOut,
        loadPhotographs,
        saveChanges,
        resetChanges,
        selectSection,
        selectProject,
        reorderSections,
        reorderProjects,
        notifyNavigationBlocked,
        createSection,
        renameSection,
        deleteSection,
        createProject,
        deleteProject,
        uploadProjectAssets,
        manageProjectAssets,
    } = usePhotographsManagement()

    const headerAction = <PhotographManagementHeaderActions onSignOut={signOut} />

    if (isAuthLoading || !user || !isAllowed || isLoading) {
        return (
            <AdminManagementLayout headerAction={user && isAllowed ? headerAction : undefined}>
                <PhotographManagementLoading />
            </AdminManagementLayout>
        )
    }

    if (error) {
        return (
            <AdminManagementLayout headerAction={headerAction}>
                <PhotographManagementError message={error} onRetry={loadPhotographs} />
            </AdminManagementLayout>
        )
    }

    return (
        <AdminManagementLayout headerAction={headerAction}>
            <PhotographsManagementShell
                sections={sections}
                selectedSectionId={selectedSectionId}
                sectionTitle={sectionTitle}
                projects={projects}
                selectedProjectId={selectedProjectId}
                projectDraft={projectDraft}
                onChangeProjectDraft={updateProjectDraft}
                hasChanges={hasChanges}
                hasProjectChanges={hasProjectChanges}
                hasProjectOrderChanges={hasProjectOrderChanges}
                hasSectionOrderChanges={hasSectionOrderChanges}
                changeMode={changeMode}
                isDraftValid={isDraftValid}
                isSaving={isSaving}
                isUploadingAsset={isUploadingAsset}
                isCreatingProject={isCreatingProject}
                isCreatingSection={isCreatingSection}
                isManagingProject={isManagingProject}
                isManagingSection={isManagingSection}
                isManagingAssets={isManagingAssets}
                assetUploadProgress={assetUploadProgress}
                projectCreateProgress={projectCreateProgress}
                isNavigationBlocked={isNavigationBlocked}
                isSectionOrderEditingDisabled={isSectionOrderEditingDisabled}
                isProjectOrderEditingDisabled={isProjectOrderEditingDisabled}
                isConflict={isConflict}
                onSaveChanges={saveChanges}
                onResetChanges={resetChanges}
                onReloadPhotographs={loadPhotographs}
                onSelectSection={selectSection}
                onSelectProject={selectProject}
                onReorderSections={reorderSections}
                onReorderProjects={reorderProjects}
                onNavigationBlocked={notifyNavigationBlocked}
                onCreateSection={createSection}
                onRenameSection={renameSection}
                onDeleteSection={deleteSection}
                onCreateProject={createProject}
                onDeleteProject={deleteProject}
                onUploadProjectAssets={uploadProjectAssets}
                onManageProjectAssets={manageProjectAssets}
            />
        </AdminManagementLayout>
    )
}

function PhotographManagementHeaderActions({ onSignOut }: { onSignOut: () => Promise<void> }) {
    return (
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/photographs" target="_blank">
                    공개 화면 <ExternalLink aria-hidden="true" />
                </Link>
            </Button>
            <Button variant="outline" onClick={onSignOut}>
                로그아웃 <LogOut aria-hidden="true" />
            </Button>
        </div>
    )
}

function PhotographManagementLoading() {
    return (
        <div className="animate-pulse overflow-hidden rounded-xl border bg-card shadow">
            <div className="space-y-3 border-b p-6">
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-8 w-64 rounded bg-muted" />
                <div className="h-4 w-96 max-w-full rounded bg-muted" />
            </div>
            <div className="space-y-8 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="h-10 rounded bg-muted" />
                    <div className="h-10 rounded bg-muted" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {Array.from({ length: 12 }, (_, index) => (
                        <div key={index} className="aspect-[4/5] rounded-lg bg-muted" />
                    ))}
                </div>
            </div>
        </div>
    )
}

function PhotographManagementError({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-8 text-center">
            <p className="text-sm font-medium text-destructive" role="alert">
                {message}
            </p>
            <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
                다시 불러오기
            </Button>
        </div>
    )
}
