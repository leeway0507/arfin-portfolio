'use client'

import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import {
    AutoScrollActivator,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    type DragEndEvent,
    type Modifier,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    SortableContext,
    arrayMove,
    horizontalListSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
    GripVertical,
    ImagePlus,
    Images,
    Monitor,
    MoveHorizontal,
    Plus,
    RotateCcw,
    Save,
    Smartphone,
    Trash2,
} from 'lucide-react'
import { PhotographProjectLayout } from '@/components/photographs/photograph-project-layout'
import { Button } from '@/components/ui/button'
import { buildR2ImageUrl } from '@/lib/apis/image-url'
import type {
    PhotographAssetTarget,
    PhotographAssetManagementUpdate,
    PhotographAssetUploadItem,
    PhotographImageMetadata,
    PhotographProjectCreation,
    PhotographProjectMetadata,
    PhotographSectionCreation,
    PhotographSectionMetadata,
    PhotographTextPosition,
} from '@/lib/apis/photographs/types'
import { cn } from '@/lib/utils'
import type { PhotographManagementChangeMode } from '../types'
import { PhotographAssetDialog } from './photograph-asset-dialog'
import { PhotographAssetManageDialog } from './photograph-asset-manage-dialog'
import { PhotographProjectCreateDialog } from './photograph-project-create-dialog'
import { PhotographProjectManageDialog } from './photograph-project-manage-dialog'
import { PhotographProjectTabs } from './photograph-project-tabs'
import { PhotographSectionCreateDialog } from './photograph-section-create-dialog'
import { PhotographSectionManageDialog } from './photograph-section-manage-dialog'
import { PhotographSectionTabs } from './photograph-section-tabs'

interface PhotographsManagementShellProps {
    sections: PhotographSectionMetadata[]
    selectedSectionId: string | null
    sectionTitle: string | null
    projects: PhotographProjectMetadata[]
    selectedProjectId: string | null
    projectDraft: PhotographProjectMetadata | null
    onChangeProjectDraft: (
        updateProject: (project: PhotographProjectMetadata) => PhotographProjectMetadata,
    ) => void
    hasChanges: boolean
    hasProjectChanges: boolean
    hasProjectOrderChanges: boolean
    hasSectionOrderChanges: boolean
    changeMode: PhotographManagementChangeMode
    isDraftValid: boolean
    isSaving: boolean
    isUploadingAsset: boolean
    isCreatingProject: boolean
    isCreatingSection: boolean
    isManagingProject: boolean
    isManagingSection: boolean
    isManagingAssets: boolean
    assetUploadProgress: string | null
    projectCreateProgress: string | null
    isNavigationBlocked: boolean
    isSectionOrderEditingDisabled: boolean
    isProjectOrderEditingDisabled: boolean
    isConflict: boolean
    onSaveChanges: () => void
    onResetChanges: () => void
    onReloadPhotographs: () => void
    onSelectSection: (sectionId: string) => void
    onSelectProject: (projectId: string) => void
    onReorderSections: (activeSectionId: string, overSectionId: string) => void
    onReorderProjects: (activeProjectId: string, overProjectId: string) => void
    onNavigationBlocked: () => void
    onCreateSection: (creation: PhotographSectionCreation) => Promise<boolean>
    onRenameSection: (sectionId: string, title: string) => Promise<boolean>
    onDeleteSection: (sectionId: string) => Promise<boolean>
    onCreateProject: (creation: Omit<PhotographProjectCreation, 'sectionId'>) => Promise<boolean>
    onDeleteProject: (projectId: string) => Promise<boolean>
    onUploadProjectAssets: (
        target: PhotographAssetTarget,
        assets: PhotographAssetUploadItem[],
    ) => Promise<boolean>
    onManageProjectAssets: (update: PhotographAssetManagementUpdate) => Promise<boolean>
}

type PreviewMode = 'pc' | 'mobile'

interface PhotographProjectWysiwygEditorProps {
    projectDraft: PhotographProjectMetadata
    previewMode: PreviewMode
    isEditingDisabled: boolean
    onChangeProjectDraft: PhotographsManagementShellProps['onChangeProjectDraft']
    onOpenAssetDialog: (mode: PhotographAssetTarget) => void
}

interface PhotographProjectCopyEditorProps {
    projectDraft: PhotographProjectMetadata
    isEditingDisabled: boolean
    onChangeProjectDraft: PhotographsManagementShellProps['onChangeProjectDraft']
}

interface PhotographProjectHeroEditorProps {
    heroImage: PhotographImageMetadata
    isEditingDisabled: boolean
    onSelectHeroImage: () => void
}

interface PhotographTextPositionHandleProps {
    textPosition: PhotographTextPosition
    isEditingDisabled: boolean
    onChangeTextPosition: (position: PhotographTextPosition) => void
}

interface PhotographProjectGalleryEditorProps {
    galleryImages: PhotographImageMetadata[]
    galleryImageIds: string[]
    isEditingDisabled: boolean
    onReorderGalleryImages: (activeImageId: string, overImageId: string) => void
    onRemoveGalleryImage: (imageId: string) => void
    onAddGalleryImage: () => void
}

interface SortableGalleryImageProps {
    image: PhotographImageMetadata
    imageIndex: number
    isEditingDisabled: boolean
    onRemoveGalleryImage: (imageId: string) => void
}

interface PhotographsManagementActionsProps {
    hasProjectChanges: boolean
    hasProjectOrderChanges: boolean
    hasSectionOrderChanges: boolean
    changeMode: PhotographManagementChangeMode
    isDraftValid: boolean
    isSaving: boolean
    isUploadingAsset: boolean
    isCreatingProject: boolean
    isCreatingSection: boolean
    isManagingProject: boolean
    isManagingSection: boolean
    isManagingAssets: boolean
    isConflict: boolean
    onSaveChanges: () => void
    onResetChanges: () => void
}

export function PhotographsManagementShell({
    sections,
    selectedSectionId,
    sectionTitle,
    projects,
    selectedProjectId,
    projectDraft,
    onChangeProjectDraft,
    hasChanges,
    hasProjectChanges,
    hasProjectOrderChanges,
    hasSectionOrderChanges,
    changeMode,
    isDraftValid,
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
    onSaveChanges,
    onResetChanges,
    onReloadPhotographs,
    onSelectSection,
    onSelectProject,
    onReorderSections,
    onReorderProjects,
    onNavigationBlocked,
    onCreateSection,
    onRenameSection,
    onDeleteSection,
    onCreateProject,
    onDeleteProject,
    onUploadProjectAssets,
    onManageProjectAssets,
}: PhotographsManagementShellProps) {
    const [previewMode, setPreviewMode] = useState<PreviewMode>('pc')
    const [assetDialogMode, setAssetDialogMode] = useState<PhotographAssetTarget | null>(null)
    const [isProjectCreateDialogOpen, setIsProjectCreateDialogOpen] = useState(false)
    const [isProjectManageDialogOpen, setIsProjectManageDialogOpen] = useState(false)
    const [isAssetManageDialogOpen, setIsAssetManageDialogOpen] = useState(false)
    const [isSectionCreateDialogOpen, setIsSectionCreateDialogOpen] = useState(false)
    const [isSectionManageDialogOpen, setIsSectionManageDialogOpen] = useState(false)
    const selectedSection = useMemo(
        () => sections.find((section) => section.id === selectedSectionId) ?? null,
        [sections, selectedSectionId],
    )
    const selectedProject = useMemo(
        () => projects.find((project) => project.id === selectedProjectId) ?? null,
        [projects, selectedProjectId],
    )
    const handleRequestProjectCreate = () => {
        if (isNavigationBlocked) {
            onNavigationBlocked()
            return
        }
        setIsProjectCreateDialogOpen(true)
    }
    const handleRequestAssetManagement = () => {
        if (isNavigationBlocked) {
            onNavigationBlocked()
            return
        }
        setIsAssetManageDialogOpen(true)
    }
    const isEditingDisabled =
        hasProjectOrderChanges ||
        hasSectionOrderChanges ||
        isSaving ||
        isUploadingAsset ||
        isCreatingProject ||
        isCreatingSection ||
        isManagingProject ||
        isManagingSection ||
        isManagingAssets ||
        isConflict

    return (
        <div className="overflow-hidden rounded-xl border bg-muted/30 shadow-sm">
            <PhotographSectionTabs
                sections={sections}
                selectedSectionId={selectedSectionId}
                isNavigationBlocked={isNavigationBlocked}
                isOrderEditingDisabled={isSectionOrderEditingDisabled}
                hasOrderChanges={hasSectionOrderChanges}
                onSelectSection={onSelectSection}
                onReorderSections={onReorderSections}
                onRequestCreateSection={() => setIsSectionCreateDialogOpen(true)}
                onRequestManageSection={() => setIsSectionManageDialogOpen(true)}
                onNavigationBlocked={onNavigationBlocked}
            />
            {isConflict ? (
                <PhotographsConflictNotice onReloadPhotographs={onReloadPhotographs} />
            ) : null}
            <section
                id="photograph-section-panel"
                role="tabpanel"
                aria-labelledby={
                    selectedSectionId ? `photograph-section-tab-${selectedSectionId}` : undefined
                }
            >
                {selectedSectionId && sectionTitle ? (
                    <>
                        <PhotographProjectTabs
                            sectionTitle={sectionTitle}
                            projects={projects}
                            selectedProjectId={selectedProjectId}
                            isNavigationBlocked={isNavigationBlocked}
                            isOrderEditingDisabled={isProjectOrderEditingDisabled}
                            hasOrderChanges={hasProjectOrderChanges}
                            onSelectProject={onSelectProject}
                            onReorderProjects={onReorderProjects}
                            onRequestCreateProject={handleRequestProjectCreate}
                            onRequestManageProject={() => setIsProjectManageDialogOpen(true)}
                            onNavigationBlocked={onNavigationBlocked}
                        />
                        {projectDraft && selectedProjectId ? (
                            <PhotographsManagementToolbar
                                previewMode={previewMode}
                                isImageManagementDisabled={isNavigationBlocked}
                                onChangePreviewMode={setPreviewMode}
                                onOpenImageManagement={handleRequestAssetManagement}
                            />
                        ) : null}
                        <PhotographsManagementActions
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
                            isConflict={isConflict}
                            onSaveChanges={onSaveChanges}
                            onResetChanges={onResetChanges}
                        />
                        {projectDraft && selectedProjectId ? (
                            <div
                                id="photograph-project-panel"
                                role="tabpanel"
                                aria-labelledby={`photograph-project-tab-${selectedProjectId}`}
                            >
                                <PhotographProjectWysiwygEditor
                                    projectDraft={projectDraft}
                                    previewMode={previewMode}
                                    isEditingDisabled={isEditingDisabled}
                                    onChangeProjectDraft={onChangeProjectDraft}
                                    onOpenAssetDialog={setAssetDialogMode}
                                />
                            </div>
                        ) : (
                            <PhotographSectionEmptyState
                                sectionTitle={sectionTitle}
                                onCreateFirstProject={handleRequestProjectCreate}
                            />
                        )}
                    </>
                ) : (
                    <PhotographsEmptyState
                        onCreateFirstSection={() => setIsSectionCreateDialogOpen(true)}
                    />
                )}
            </section>
            <PhotographAssetDialog
                mode={assetDialogMode}
                hasUnsavedChanges={hasChanges}
                isUploadingAsset={isUploadingAsset}
                assetUploadProgress={assetUploadProgress}
                isConflict={isConflict}
                onClose={() => setAssetDialogMode(null)}
                onUploadImages={onUploadProjectAssets}
            />
            <PhotographAssetManageDialog
                sectionId={selectedSectionId}
                project={selectedProject}
                isOpen={isAssetManageDialogOpen}
                isManagingAssets={isManagingAssets}
                isConflict={isConflict}
                onClose={() => setIsAssetManageDialogOpen(false)}
                onManageAssets={onManageProjectAssets}
                onReloadPhotographs={onReloadPhotographs}
            />
            <PhotographProjectManageDialog
                project={selectedProject}
                isOpen={isProjectManageDialogOpen}
                isManagingProject={isManagingProject}
                isConflict={isConflict}
                onClose={() => setIsProjectManageDialogOpen(false)}
                onDeleteProject={onDeleteProject}
                onReloadPhotographs={onReloadPhotographs}
            />
            <PhotographSectionManageDialog
                section={selectedSection}
                isOpen={isSectionManageDialogOpen}
                isManagingSection={isManagingSection}
                isConflict={isConflict}
                onClose={() => setIsSectionManageDialogOpen(false)}
                onRenameSection={onRenameSection}
                onDeleteSection={onDeleteSection}
                onReloadPhotographs={onReloadPhotographs}
            />
            <PhotographProjectCreateDialog
                isOpen={isProjectCreateDialogOpen}
                sectionTitle={sectionTitle ?? 'Photographs'}
                isCreatingProject={isCreatingProject}
                isConflict={isConflict}
                projectCreateProgress={projectCreateProgress}
                onClose={() => setIsProjectCreateDialogOpen(false)}
                onCreateProject={onCreateProject}
            />
            <PhotographSectionCreateDialog
                isOpen={isSectionCreateDialogOpen}
                isCreatingSection={isCreatingSection}
                isConflict={isConflict}
                onClose={() => setIsSectionCreateDialogOpen(false)}
                onCreateSection={onCreateSection}
            />
        </div>
    )
}

function PhotographsConflictNotice({ onReloadPhotographs }: { onReloadPhotographs: () => void }) {
    return (
        <div
            className="mx-5 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
            role="alert"
        >
            <p className="text-sm text-destructive">
                다른 곳에서 먼저 수정했습니다. 최신 내용을 다시 불러와 주세요.
            </p>
            <Button type="button" size="sm" variant="outline" onClick={onReloadPhotographs}>
                다시 불러오기
            </Button>
        </div>
    )
}

function PhotographsManagementToolbar({
    previewMode,
    isImageManagementDisabled,
    onChangePreviewMode,
    onOpenImageManagement,
}: {
    previewMode: PreviewMode
    isImageManagementDisabled: boolean
    onChangePreviewMode: (mode: PreviewMode) => void
    onOpenImageManagement: () => void
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-5 py-3">
            <p className="text-sm text-muted-foreground">
                공개 화면과 같은 배치에서 문구와 이미지를 직접 편집합니다.
            </p>
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    id="photograph-asset-management-trigger"
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isImageManagementDisabled}
                    onClick={onOpenImageManagement}
                >
                    <Images aria-hidden="true" /> 이미지 관리
                </Button>
                <PhotographPreviewModeControl
                    previewMode={previewMode}
                    onChangePreviewMode={onChangePreviewMode}
                />
            </div>
        </div>
    )
}

function PhotographPreviewModeControl({
    previewMode,
    onChangePreviewMode,
}: {
    previewMode: PreviewMode
    onChangePreviewMode: (mode: PreviewMode) => void
}) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">미리보기</span>
            <div className="inline-flex rounded-lg border bg-background p-0.5">
                <button
                    type="button"
                    aria-label="PC 미리보기"
                    aria-pressed={previewMode === 'pc'}
                    onClick={() => onChangePreviewMode('pc')}
                    className={cn(
                        'inline-flex size-7 items-center justify-center rounded-md transition-colors',
                        previewMode === 'pc'
                            ? 'bg-black text-white shadow-sm'
                            : 'text-muted-foreground hover:bg-muted',
                    )}
                >
                    <Monitor className="size-3.5" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    aria-label="모바일 미리보기"
                    aria-pressed={previewMode === 'mobile'}
                    onClick={() => onChangePreviewMode('mobile')}
                    className={cn(
                        'inline-flex size-7 items-center justify-center rounded-md transition-colors',
                        previewMode === 'mobile'
                            ? 'bg-black text-white shadow-sm'
                            : 'text-muted-foreground hover:bg-muted',
                    )}
                >
                    <Smartphone className="size-3.5" aria-hidden="true" />
                </button>
            </div>
        </div>
    )
}

function PhotographsManagementActions({
    hasProjectChanges,
    hasProjectOrderChanges,
    hasSectionOrderChanges,
    changeMode,
    isDraftValid,
    isSaving,
    isUploadingAsset,
    isCreatingProject,
    isCreatingSection,
    isManagingProject,
    isManagingSection,
    isManagingAssets,
    isConflict,
    onSaveChanges,
    onResetChanges,
}: PhotographsManagementActionsProps) {
    const hasChanges = hasProjectChanges || hasProjectOrderChanges || hasSectionOrderChanges
    const actionCopy = getPhotographsManagementActionCopy(
        changeMode,
        isSaving,
        hasChanges && !changeMode,
    )

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-5 py-3">
            <p className="text-sm text-muted-foreground">{actionCopy.changeStatus}</p>
            <div className="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    disabled={
                        !hasChanges ||
                        isSaving ||
                        isUploadingAsset ||
                        isCreatingProject ||
                        isCreatingSection ||
                        isManagingProject ||
                        isManagingSection ||
                        isManagingAssets
                    }
                    onClick={onResetChanges}
                >
                    <RotateCcw aria-hidden="true" /> {actionCopy.resetLabel}
                </Button>
                <Button
                    type="button"
                    disabled={
                        !changeMode ||
                        (changeMode === 'project' && !isDraftValid) ||
                        isSaving ||
                        isUploadingAsset ||
                        isCreatingProject ||
                        isCreatingSection ||
                        isManagingProject ||
                        isManagingSection ||
                        isManagingAssets ||
                        isConflict
                    }
                    onClick={onSaveChanges}
                >
                    <Save aria-hidden="true" /> {actionCopy.saveLabel}
                </Button>
            </div>
        </div>
    )
}

function PhotographProjectWysiwygEditor({
    projectDraft,
    previewMode,
    isEditingDisabled,
    onChangeProjectDraft,
    onOpenAssetDialog,
}: PhotographProjectWysiwygEditorProps) {
    const heroImage = findProjectImage(projectDraft, projectDraft.heroImageId)
    const galleryImages = useMemo(() => findGalleryImages(projectDraft), [projectDraft])

    const handleReorderGalleryImages = (activeImageId: string, overImageId: string) => {
        onChangeProjectDraft((project) => {
            const activeIndex = project.galleryImageIds.indexOf(activeImageId)
            const overIndex = project.galleryImageIds.indexOf(overImageId)
            if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return project

            return {
                ...project,
                galleryImageIds: arrayMove(project.galleryImageIds, activeIndex, overIndex),
            }
        })
    }

    const handleRemoveGalleryImage = (imageId: string) => {
        onChangeProjectDraft((project) => ({
            ...project,
            galleryImageIds: project.galleryImageIds.filter((id) => id !== imageId),
        }))
    }

    return (
        <div className="overflow-x-auto px-4 py-8 sm:px-8">
            <div
                className={cn(
                    "mx-auto overflow-hidden bg-white font-['Pretendard_Variable'] text-black shadow-[0_18px_60px_rgba(0,0,0,0.09)] transition-[width]",
                    previewMode === 'pc' ? 'w-[1180px] max-w-none' : 'w-[390px] max-w-full',
                )}
            >
                <div className={cn('mx-auto', previewMode === 'pc' ? 'p-12' : 'px-5 py-8')}>
                    <div className="relative">
                        <PhotographProjectLayout
                            textPosition={projectDraft.textPosition}
                            mode={previewMode}
                            className={previewMode === 'pc' ? 'min-h-[540px]' : undefined}
                            textContent={
                                <PhotographProjectCopyEditor
                                    projectDraft={projectDraft}
                                    isEditingDisabled={isEditingDisabled}
                                    onChangeProjectDraft={onChangeProjectDraft}
                                />
                            }
                            heroContent={
                                <PhotographProjectHeroEditor
                                    heroImage={heroImage}
                                    isEditingDisabled={isEditingDisabled}
                                    onSelectHeroImage={() => onOpenAssetDialog('hero')}
                                />
                            }
                        />
                        {previewMode === 'pc' ? (
                            <PhotographTextPositionHandle
                                textPosition={projectDraft.textPosition}
                                isEditingDisabled={isEditingDisabled}
                                onChangeTextPosition={(textPosition) =>
                                    onChangeProjectDraft((project) => ({
                                        ...project,
                                        textPosition,
                                    }))
                                }
                            />
                        ) : null}
                    </div>
                    <PhotographProjectGalleryEditor
                        galleryImages={galleryImages}
                        galleryImageIds={projectDraft.galleryImageIds}
                        isEditingDisabled={isEditingDisabled}
                        onReorderGalleryImages={handleReorderGalleryImages}
                        onRemoveGalleryImage={handleRemoveGalleryImage}
                        onAddGalleryImage={() => onOpenAssetDialog('gallery')}
                    />
                </div>
            </div>
        </div>
    )
}

function PhotographProjectCopyEditor({
    projectDraft,
    isEditingDisabled,
    onChangeProjectDraft,
}: PhotographProjectCopyEditorProps) {
    return (
        <div className="flex w-full max-w-[34rem] flex-col items-center text-center">
            <label className="w-full">
                <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
                    매체명 · 클릭해 수정
                </span>
                <textarea
                    value={projectDraft.publication}
                    rows={1}
                    maxLength={120}
                    disabled={isEditingDisabled}
                    onChange={(event) =>
                        onChangeProjectDraft((project) => ({
                            ...project,
                            publication: event.target.value,
                        }))
                    }
                    className="min-h-12 w-full resize-none overflow-hidden rounded-t-md border-x-0 border-b border-t-0 border-dashed border-neutral-300 bg-neutral-50/70 px-3 py-2 text-center text-[1.625rem] font-semibold leading-tight tracking-[-0.025em] outline-none transition-colors [field-sizing:content] hover:border-neutral-500 hover:bg-neutral-100/80 focus-visible:border-black focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2 disabled:opacity-60"
                />
            </label>
            <hr className="my-5 w-7 border-0 border-t-2 border-black" />
            <label className="w-full">
                <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
                    프로젝트 제목 · 클릭해 수정
                </span>
                <textarea
                    value={projectDraft.title}
                    rows={1}
                    maxLength={120}
                    disabled={isEditingDisabled}
                    onChange={(event) =>
                        onChangeProjectDraft((project) => ({
                            ...project,
                            title: event.target.value,
                        }))
                    }
                    className="min-h-11 w-full resize-none overflow-hidden rounded-t-md border-x-0 border-b border-t-0 border-dashed border-neutral-300 bg-neutral-50/70 px-3 py-2 text-center text-[1.375rem] leading-tight tracking-[-0.02em] outline-none transition-colors [field-sizing:content] hover:border-neutral-500 hover:bg-neutral-100/80 focus-visible:border-black focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2 disabled:opacity-60"
                />
            </label>
            {!projectDraft.publication.trim() || !projectDraft.title.trim() ? (
                <p className="mt-3 text-xs text-destructive" role="alert">
                    두 문구를 모두 입력해 주세요.
                </p>
            ) : null}
        </div>
    )
}

function PhotographProjectHeroEditor({
    heroImage,
    isEditingDisabled,
    onSelectHeroImage,
}: PhotographProjectHeroEditorProps) {
    return (
        <figure className="group relative mx-auto w-full max-w-[32rem] overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={buildR2ImageUrl(heroImage.objectKey)}
                alt={heroImage.alt}
                width={heroImage.width}
                height={heroImage.height}
                className="h-auto w-full object-contain"
            />
            <button
                type="button"
                disabled={isEditingDisabled}
                onClick={onSelectHeroImage}
                className="absolute inset-x-4 bottom-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-black/80 px-4 text-sm font-medium text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
            >
                <ImagePlus className="size-4" aria-hidden="true" /> 상단 이미지 교체
            </button>
        </figure>
    )
}

function PhotographTextPositionHandle({
    textPosition,
    isEditingDisabled,
    onChangeTextPosition,
}: PhotographTextPositionHandleProps) {
    const [dragStartX, setDragStartX] = useState<number | null>(null)
    const [dragOffset, setDragOffset] = useState(0)
    const didApplyPositionRef = useRef(false)

    const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (isEditingDisabled) return
        event.currentTarget.setPointerCapture(event.pointerId)
        didApplyPositionRef.current = false
        setDragStartX(event.clientX)
    }

    const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (dragStartX === null) return

        const rawOffset = event.clientX - dragStartX
        setDragOffset(Math.max(-18, Math.min(18, rawOffset)))
        if (Math.abs(rawOffset) < POSITION_DRAG_THRESHOLD || didApplyPositionRef.current) return

        didApplyPositionRef.current = true
        onChangeTextPosition(rawOffset > 0 ? 'right' : 'left')
    }

    const finishPointerDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
        }
        setDragStartX(null)
        setDragOffset(0)
    }

    const cancelPointerDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
        finishPointerDrag(event)
        didApplyPositionRef.current = false
    }

    const handleToggleTextPosition = () => {
        if (didApplyPositionRef.current) {
            didApplyPositionRef.current = false
            return
        }
        onChangeTextPosition(textPosition === 'left' ? 'right' : 'left')
    }

    return (
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <button
                type="button"
                disabled={isEditingDisabled}
                aria-label={`텍스트가 ${textPosition === 'left' ? '왼쪽' : '오른쪽'}에 있습니다. 좌우로 끌거나 클릭해 위치 변경`}
                title="좌우로 끌거나 클릭해 텍스트 위치 변경"
                onClick={handleToggleTextPosition}
                onPointerCancel={cancelPointerDrag}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishPointerDrag}
                className="flex h-14 w-11 touch-none cursor-ew-resize flex-col items-center justify-center gap-0.5 rounded-full border border-neutral-300 bg-white/95 text-neutral-500 shadow-md backdrop-blur-sm transition-[color,background-color,box-shadow] hover:border-neutral-500 hover:bg-white hover:text-black hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-50"
                style={{ transform: `translateX(${dragOffset}px)` }}
            >
                <MoveHorizontal className="size-4" aria-hidden="true" />
                <span className="text-[9px] font-medium leading-none">위치</span>
            </button>
        </div>
    )
}

function PhotographProjectGalleryEditor({
    galleryImages,
    galleryImageIds,
    isEditingDisabled,
    onReorderGalleryImages,
    onRemoveGalleryImage,
    onAddGalleryImage,
}: PhotographProjectGalleryEditorProps) {
    const imageSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: getHorizontalSortableKeyboardCoordinates,
        }),
    )

    return (
        <section
            className="mt-12 border-t border-black/10 pt-6"
            aria-labelledby="gallery-editor-title"
        >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 id="gallery-editor-title" className="text-sm font-semibold">
                        하단 이미지
                    </h2>
                    <p className="mt-1 text-xs text-neutral-500">
                        끌어서 순서를 바꿉니다. 제거해도 상단 이미지와 원본 자산은 유지됩니다.
                    </p>
                </div>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isEditingDisabled}
                    onClick={onAddGalleryImage}
                >
                    <Plus aria-hidden="true" /> 이미지 추가
                </Button>
            </div>
            {galleryImages.length > 0 ? (
                <DndContext
                    sensors={imageSensors}
                    collisionDetection={closestCenter}
                    autoScroll={GALLERY_AUTO_SCROLL_OPTIONS}
                    modifiers={GALLERY_DRAG_MODIFIERS}
                    onDragEnd={(event) => handleGalleryDragEnd(event, onReorderGalleryImages)}
                >
                    <SortableContext
                        items={galleryImageIds}
                        strategy={horizontalListSortingStrategy}
                    >
                        <div
                            className="flex min-h-56 gap-2 overflow-x-auto overflow-y-hidden pb-3"
                            data-gallery-scroll="true"
                        >
                            {galleryImages.map((image, imageIndex) => (
                                <SortableGalleryImage
                                    key={image.id}
                                    image={image}
                                    imageIndex={imageIndex}
                                    isEditingDisabled={isEditingDisabled}
                                    onRemoveGalleryImage={onRemoveGalleryImage}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                <button
                    type="button"
                    disabled={isEditingDisabled}
                    onClick={onAddGalleryImage}
                    className="flex h-44 w-full flex-col items-center justify-center gap-2 border border-dashed border-neutral-300 text-sm text-neutral-500 transition-colors hover:border-neutral-500 hover:text-black disabled:opacity-50"
                >
                    <ImagePlus className="size-5" aria-hidden="true" /> 하단 이미지 추가
                </button>
            )}
        </section>
    )
}

function SortableGalleryImage({
    image,
    imageIndex,
    isEditingDisabled,
    onRemoveGalleryImage,
}: SortableGalleryImageProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: image.id,
        disabled: isEditingDisabled,
    })
    const sortableStyle: CSSProperties = {
        aspectRatio: `${image.width} / ${image.height}`,
        transform: CSS.Transform.toString(transform ? { ...transform, y: 0 } : transform),
        transition,
    }

    return (
        <figure
            ref={setNodeRef}
            style={sortableStyle}
            className={cn(
                'group relative h-56 shrink-0 overflow-hidden bg-neutral-100',
                isDragging && 'z-20 opacity-60 shadow-xl',
            )}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={buildR2ImageUrl(image.objectKey)}
                alt={image.alt}
                className="h-full w-full select-none object-cover"
                draggable={false}
            />
            <span className="absolute left-2 top-2 rounded bg-black/75 px-2 py-1 text-[10px] font-medium text-white">
                {imageIndex + 1}
            </span>
            <div className="absolute bottom-2 right-2 flex gap-1">
                <button
                    type="button"
                    aria-label={`${imageIndex + 1}번 하단 이미지를 이 영역에서만 제거`}
                    disabled={isEditingDisabled}
                    onClick={() => onRemoveGalleryImage(image.id)}
                    className="flex size-8 items-center justify-center rounded-md bg-white/90 text-black shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50"
                    title="하단에서만 제거"
                >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    aria-label={`${imageIndex + 1}번 하단 이미지 순서 이동`}
                    disabled={isEditingDisabled}
                    className="flex size-8 touch-none items-center justify-center rounded-md bg-white/90 text-black shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="size-3.5" aria-hidden="true" />
                </button>
            </div>
        </figure>
    )
}

function PhotographSectionEmptyState({
    sectionTitle,
    onCreateFirstProject,
}: {
    sectionTitle: string
    onCreateFirstProject: () => void
}) {
    return (
        <div className="flex min-h-80 flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {sectionTitle}
            </p>
            <h2 className="mt-3 text-xl font-semibold">아직 소주제가 없습니다.</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
                첫 소주제와 대표 이미지를 추가하면 공개 Photographs 화면에 표시됩니다.
            </p>
            <Button type="button" className="mt-5" onClick={onCreateFirstProject}>
                <Plus aria-hidden="true" /> 첫 소주제 추가
            </Button>
        </div>
    )
}

function PhotographsEmptyState({ onCreateFirstSection }: { onCreateFirstSection: () => void }) {
    return (
        <div className="flex min-h-80 flex-col items-center justify-center px-6 py-16 text-center">
            <h2 className="text-xl font-semibold">아직 대주제가 없습니다.</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Editorial이나 Cover 같은 첫 대주제를 추가해 주세요.
            </p>
            <Button type="button" className="mt-5" onClick={onCreateFirstSection}>
                <Plus aria-hidden="true" /> 첫 대주제 추가
            </Button>
        </div>
    )
}

function findProjectImage(
    project: PhotographProjectMetadata,
    imageId: string,
): PhotographImageMetadata {
    return project.images.find((image) => image.id === imageId) ?? project.images[0]
}

function findGalleryImages(project: PhotographProjectMetadata): PhotographImageMetadata[] {
    const imageById = new Map(project.images.map((image) => [image.id, image]))
    return project.galleryImageIds.flatMap((imageId) => {
        const image = imageById.get(imageId)
        return image ? [image] : []
    })
}

function handleGalleryDragEnd(
    event: DragEndEvent,
    onReorderGalleryImages: (activeImageId: string, overImageId: string) => void,
) {
    if (!event.over || event.active.id === event.over.id) return
    onReorderGalleryImages(String(event.active.id), String(event.over.id))
}

function restrictGalleryDragToHorizontalAxis({ transform }: Parameters<Modifier>[0]) {
    return { ...transform, y: 0 }
}

function canAutoScrollGallery(element: Element): boolean {
    return (
        element instanceof HTMLElement &&
        element.dataset.galleryScroll === 'true' &&
        element.scrollWidth > element.clientWidth
    )
}

function getHorizontalSortableKeyboardCoordinates(
    event: KeyboardEvent,
    context: Parameters<typeof sortableKeyboardCoordinates>[1],
) {
    if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
        event.preventDefault()
        return undefined
    }
    return sortableKeyboardCoordinates(event, context)
}

function getPhotographsManagementActionCopy(
    changeMode: PhotographManagementChangeMode,
    isSaving: boolean,
    hasInvalidConcurrentChanges: boolean,
) {
    if (hasInvalidConcurrentChanges) {
        return {
            changeStatus: '서로 다른 종류의 변경사항이 동시에 있어 저장할 수 없습니다.',
            resetLabel: '변경 취소',
            saveLabel: '저장',
        }
    }
    if (changeMode === 'section-order') {
        return {
            changeStatus: '저장하지 않은 대주제 순서 변경사항이 있습니다.',
            resetLabel: '대주제 순서 취소',
            saveLabel: isSaving ? '대주제 순서 저장 중' : '대주제 순서 저장',
        }
    }
    if (changeMode === 'project-order') {
        return {
            changeStatus: '저장하지 않은 소주제 순서 변경사항이 있습니다.',
            resetLabel: '소주제 순서 취소',
            saveLabel: isSaving ? '소주제 순서 저장 중' : '소주제 순서 저장',
        }
    }
    if (changeMode === 'project') {
        return {
            changeStatus: '저장하지 않은 프로젝트 변경사항이 있습니다.',
            resetLabel: '변경 취소',
            saveLabel: isSaving ? '저장 중' : '저장',
        }
    }
    return {
        changeStatus: '저장된 상태입니다.',
        resetLabel: '변경 취소',
        saveLabel: '저장',
    }
}

const POSITION_DRAG_THRESHOLD = 30
const GALLERY_DRAG_MODIFIERS: Modifier[] = [restrictGalleryDragToHorizontalAxis]
const GALLERY_AUTO_SCROLL_OPTIONS = {
    activator: AutoScrollActivator.DraggableRect,
    canScroll: canAutoScrollGallery,
    layoutShiftCompensation: { x: true, y: false },
}
