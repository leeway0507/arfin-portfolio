'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
    PhotographApiError,
    createPhotographProject,
    createPhotographSection,
    deletePhotographProject,
    deletePhotographSection,
    getPhotographManifestSnapshot,
    managePhotographAssets,
    renamePhotographSection,
    updatePhotographProject,
    updatePhotographProjectOrder,
    updatePhotographSectionOrder,
    uploadPhotographAssets,
} from '@/lib/apis/photographs/api'
import type {
    PhotographAssetTarget,
    PhotographAssetManagementUpdate,
    PhotographAssetUploadItem,
    PhotographProjectCreation,
    PhotographProjectMetadata,
    PhotographSectionCreation,
    PhotographSectionMetadata,
} from '@/lib/apis/photographs/types'
import { usePhotographManagementOperation } from './use-photograph-management-operation'
import { compressPhotographAssets } from '../lib/compress-photograph-assets'
import {
    getPhotographManagementOperationProgress,
    isPhotographManagementOperation,
} from '../lib/photograph-management-operation'
import {
    hasPhotographOrderChanges,
    mapProjectsToDraftOrder,
    mapSectionsToDraftOrder,
    movePhotographOrderId,
} from '../lib/photograph-order-state'
import { getPhotographManagementPolicy } from '../lib/photograph-management-policy'
import {
    getPhotographWorkspaceSelection,
    getProjectSelectionAfterDelete,
    getSectionSelectionAfterDelete,
    getSectionProjectSelection,
    replacePhotographProject,
    replacePhotographSection,
} from '../lib/photographs-management-state'
import type { PhotographManagementChangeMode, PhotographsManagementModels } from '../types'

type ProjectCreationInput = Omit<PhotographProjectCreation, 'sectionId'>
type GetAdminIdToken = () => Promise<string>

export function usePhotographsManagement(getIdToken: GetAdminIdToken): PhotographsManagementModels {
    const [savedSections, setSavedSections] = useState<PhotographSectionMetadata[]>([])
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
    const selectedSectionIdRef = useRef<string | null>(null)
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const selectedProjectIdRef = useRef<string | null>(null)
    const [sectionOrderDraft, setSectionOrderDraft] = useState<string[]>([])
    const [projectOrderDraft, setProjectOrderDraft] = useState<string[]>([])
    const [projectDraft, setProjectDraft] = useState<PhotographProjectMetadata | null>(null)
    const [etag, setEtag] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const { operation, startOperation } = usePhotographManagementOperation()
    const [isConflict, setIsConflict] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const selectProjectDraft = useCallback((project: PhotographProjectMetadata | null) => {
        selectedProjectIdRef.current = project?.id ?? null
        setSelectedProjectId(project?.id ?? null)
        setProjectDraft(project)
    }, [])

    const selectSectionDraft = useCallback(
        (section: PhotographSectionMetadata, preferredProjectId?: string | null) => {
            selectedSectionIdRef.current = section.id
            setSelectedSectionId(section.id)
            setProjectOrderDraft(section.projects.map((project) => project.id))
            selectProjectDraft(getSectionProjectSelection(section, preferredProjectId))
        },
        [selectProjectDraft],
    )

    const clearSelection = useCallback(() => {
        selectedSectionIdRef.current = null
        setSelectedSectionId(null)
        setProjectOrderDraft([])
        selectProjectDraft(null)
    }, [selectProjectDraft])

    const loadPhotographs = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        setIsConflict(false)
        try {
            const snapshot = await getPhotographManifestSnapshot()
            const sections = snapshot.manifest.sections
            const selection = getPhotographWorkspaceSelection(
                sections,
                selectedSectionIdRef.current,
                selectedProjectIdRef.current,
            )

            setSavedSections(sections)
            setSectionOrderDraft(sections.map((section) => section.id))
            if (selection.section) {
                selectSectionDraft(selection.section, selection.project?.id)
            } else {
                clearSelection()
            }
            setEtag(snapshot.etag)
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Photographs 설정을 불러오지 못했습니다.',
            )
        } finally {
            setIsLoading(false)
        }
    }, [clearSelection, selectSectionDraft])

    useEffect(() => {
        loadPhotographs()
    }, [loadPhotographs])

    const savedSection = useMemo(
        () => savedSections.find((section) => section.id === selectedSectionId) ?? null,
        [savedSections, selectedSectionId],
    )
    const orderedSections = useMemo(
        () => mapSectionsToDraftOrder(savedSections, sectionOrderDraft),
        [savedSections, sectionOrderDraft],
    )
    const orderedProjects = useMemo(
        () => mapProjectsToDraftOrder(savedSection?.projects ?? [], projectOrderDraft),
        [projectOrderDraft, savedSection],
    )
    const savedProject = useMemo(
        () => savedSection?.projects.find((project) => project.id === selectedProjectId) ?? null,
        [savedSection, selectedProjectId],
    )
    const hasProjectChanges = useMemo(
        () =>
            Boolean(
                projectDraft &&
                savedProject &&
                serializeEditableProject(projectDraft) !== serializeEditableProject(savedProject),
            ),
        [projectDraft, savedProject],
    )
    const hasProjectOrderChanges = useMemo(
        () =>
            Boolean(
                savedSection &&
                hasPhotographOrderChanges(
                    savedSection.projects.map((project) => project.id),
                    projectOrderDraft,
                ),
            ),
        [projectOrderDraft, savedSection],
    )
    const hasSectionOrderChanges = useMemo(
        () =>
            hasPhotographOrderChanges(
                savedSections.map((section) => section.id),
                sectionOrderDraft,
            ),
        [savedSections, sectionOrderDraft],
    )
    const isDraftValid = Boolean(
        projectDraft &&
        isValidProjectText(projectDraft.publication) &&
        isValidProjectText(projectDraft.title),
    )
    const { changeState, capabilities } = getPhotographManagementPolicy({
        hasProjectChanges,
        hasProjectOrderChanges,
        hasSectionOrderChanges,
        isDraftValid,
        projectCount: orderedProjects.length,
        sectionCount: orderedSections.length,
        operation,
        isConflict,
    })
    const changeMode: PhotographManagementChangeMode = changeState.mode
    const hasChanges = changeState.kind !== 'clean'
    const hasInvalidConcurrentChanges = changeState.kind === 'invalid-concurrent'
    const isSaving = isPhotographManagementOperation(operation, 'saving-changes')
    const isUploadingAsset = isPhotographManagementOperation(operation, 'uploading-assets')
    const isCreatingProject = isPhotographManagementOperation(operation, 'creating-project')
    const isCreatingSection = isPhotographManagementOperation(operation, 'creating-section')
    const isManagingProject = isPhotographManagementOperation(operation, 'deleting-project')
    const isManagingSection = isPhotographManagementOperation(
        operation,
        'renaming-section',
        'deleting-section',
    )
    const isManagingAssets = isPhotographManagementOperation(operation, 'managing-assets')
    const assetUploadProgress =
        operation.kind === 'uploading-assets'
            ? getPhotographManagementOperationProgress(operation)
            : null
    const projectCreateProgress =
        operation.kind === 'creating-project'
            ? getPhotographManagementOperationProgress(operation)
            : null
    const isNavigationBlocked = !capabilities.canNavigate
    const isProjectOrderEditingDisabled = !capabilities.canReorderProjects
    const isSectionOrderEditingDisabled = !capabilities.canReorderSections

    const selectSection = useCallback(
        (sectionId: string) => {
            if (sectionId === selectedSectionId) return
            if (isNavigationBlocked) {
                notifyNavigationBlockedMessage(hasChanges, isConflict)
                return
            }

            const section = savedSections.find((item) => item.id === sectionId)
            if (section) selectSectionDraft(section)
        },
        [
            hasChanges,
            isConflict,
            isNavigationBlocked,
            savedSections,
            selectSectionDraft,
            selectedSectionId,
        ],
    )

    const selectProject = useCallback(
        (projectId: string) => {
            if (projectId === selectedProjectId) return
            if (isNavigationBlocked) {
                notifyNavigationBlockedMessage(hasChanges, isConflict)
                return
            }

            const project = savedSection?.projects.find((item) => item.id === projectId)
            if (project) selectProjectDraft(project)
        },
        [
            hasChanges,
            isConflict,
            isNavigationBlocked,
            savedSection,
            selectProjectDraft,
            selectedProjectId,
        ],
    )

    const notifyNavigationBlocked = useCallback(() => {
        notifyNavigationBlockedMessage(hasChanges, isConflict)
    }, [hasChanges, isConflict])

    const updateProjectDraft = useCallback(
        (updateProject: (project: PhotographProjectMetadata) => PhotographProjectMetadata) => {
            if (!capabilities.canEditProject) return
            setProjectDraft((project) => (project ? updateProject(project) : project))
        },
        [capabilities.canEditProject],
    )

    const reorderProjects = useCallback(
        (activeProjectId: string, overProjectId: string) => {
            if (activeProjectId === overProjectId) return
            if (isProjectOrderEditingDisabled) {
                notifyOrderEditingBlocked(hasProjectChanges, isConflict)
                return
            }
            setProjectOrderDraft((projectIds) =>
                movePhotographOrderId(projectIds, activeProjectId, overProjectId),
            )
        },
        [hasProjectChanges, isConflict, isProjectOrderEditingDisabled],
    )

    const reorderSections = useCallback(
        (activeSectionId: string, overSectionId: string) => {
            if (activeSectionId === overSectionId) return
            if (isSectionOrderEditingDisabled) {
                notifyOrderEditingBlocked(hasProjectChanges || hasProjectOrderChanges, isConflict)
                return
            }
            setSectionOrderDraft((sectionIds) =>
                movePhotographOrderId(sectionIds, activeSectionId, overSectionId),
            )
        },
        [hasProjectChanges, hasProjectOrderChanges, isConflict, isSectionOrderEditingDisabled],
    )

    const saveChanges = useCallback(async () => {
        if (!etag || !changeMode || !capabilities.canSaveChanges) {
            if (hasInvalidConcurrentChanges) {
                toast.error('서로 다른 종류의 변경사항을 각각 저장하거나 취소해 주세요.')
            }
            return
        }
        if (changeMode === 'project' && (!selectedSectionId || !projectDraft || !isDraftValid)) {
            return
        }
        if (changeMode === 'project-order' && !selectedSectionId) return

        const operationLease = startOperation({ kind: 'saving-changes', changeMode })
        if (!operationLease) return

        try {
            if (changeMode === 'section-order') {
                const result = await updatePhotographSectionOrder(
                    getIdToken,
                    { sectionIds: sectionOrderDraft },
                    etag,
                )
                const selectedSection = result.sections.find(
                    (section) => section.id === selectedSectionId,
                )
                const selectedProject = selectedSection?.projects.find(
                    (project) => project.id === selectedProjectId,
                )

                setSavedSections(result.sections)
                setSectionOrderDraft(result.sections.map((section) => section.id))
                if (selectedSection) {
                    setProjectOrderDraft(selectedSection.projects.map((project) => project.id))
                    setProjectDraft(selectedProject ?? null)
                }
                setEtag(result.etag)
                toast.success('대주제 순서가 저장되었습니다.')
                return
            }

            if (changeMode === 'project-order') {
                const result = await updatePhotographProjectOrder(
                    getIdToken,
                    {
                        sectionId: selectedSectionId!,
                        projectIds: projectOrderDraft,
                    },
                    etag,
                )
                const selectedProject = result.section.projects.find(
                    (project) => project.id === selectedProjectId,
                )
                setSavedSections((sections) => replacePhotographSection(sections, result.section))
                setProjectOrderDraft(result.section.projects.map((project) => project.id))
                if (selectedProject) setProjectDraft(selectedProject)
                setEtag(result.etag)
                toast.success(`${result.section.title} 소주제 순서가 저장되었습니다.`)
                return
            }

            const result = await updatePhotographProject(
                getIdToken,
                {
                    sectionId: selectedSectionId!,
                    projectId: projectDraft!.id,
                    publication: projectDraft!.publication,
                    title: projectDraft!.title,
                    textPosition: projectDraft!.textPosition,
                    heroImageId: projectDraft!.heroImageId,
                    galleryImageIds: projectDraft!.galleryImageIds,
                },
                etag,
            )
            setProjectDraft(result.project)
            setSavedSections((sections) =>
                replacePhotographProject(sections, selectedSectionId!, result.project),
            )
            setEtag(result.etag)
            toast.success(`${result.project.title} 소주제가 저장되었습니다.`)
        } catch (saveError) {
            handlePhotographWriteError(
                saveError,
                setIsConflict,
                'Photographs 변경사항 저장에 실패했습니다.',
            )
        } finally {
            operationLease.finish()
        }
    }, [
        changeMode,
        capabilities.canSaveChanges,
        etag,
        hasInvalidConcurrentChanges,
        isDraftValid,
        projectOrderDraft,
        projectDraft,
        sectionOrderDraft,
        selectedProjectId,
        selectedSectionId,
        startOperation,
        getIdToken,
    ])

    const resetChanges = useCallback(() => {
        if (!capabilities.canResetChanges) {
            if (!hasInvalidConcurrentChanges) return
            toast.error('서로 다른 종류의 변경사항을 각각 취소해 주세요.')
            return
        }
        if (changeMode === 'section-order') {
            setSectionOrderDraft(savedSections.map((section) => section.id))
            return
        }
        if (changeMode === 'project-order' && savedSection) {
            setProjectOrderDraft(savedSection.projects.map((project) => project.id))
            return
        }
        if (!savedProject) return
        setProjectDraft(savedProject)
    }, [
        changeMode,
        capabilities.canResetChanges,
        hasInvalidConcurrentChanges,
        savedProject,
        savedSection,
        savedSections,
    ])

    const uploadProjectAssets = useCallback(
        async (
            target: PhotographAssetTarget,
            assets: PhotographAssetUploadItem[],
        ): Promise<boolean> => {
            if (!selectedSectionId || !projectDraft || !etag || !capabilities.canNavigate) {
                return false
            }

            const operationLease = startOperation({
                kind: 'uploading-assets',
                progress: null,
            })
            if (!operationLease) return false

            try {
                const compressedAssets = await compressPhotographAssets(
                    assets,
                    (currentCount, totalCount) =>
                        operationLease.updateProgress(`최적화 중 ${currentCount}/${totalCount}`),
                )
                operationLease.updateProgress(`업로드 중 ${compressedAssets.length}장`)
                const result = await uploadPhotographAssets(
                    getIdToken,
                    {
                        sectionId: selectedSectionId,
                        projectId: projectDraft.id,
                        target,
                        assets: compressedAssets,
                    },
                    etag,
                )
                setProjectDraft(result.project)
                setSavedSections((sections) =>
                    replacePhotographProject(sections, selectedSectionId, result.project),
                )
                setEtag(result.etag)
                toast.success(
                    target === 'hero'
                        ? '새 이미지가 상단에 저장되었습니다.'
                        : `새 이미지 ${assets.length}장이 하단에 저장되었습니다.`,
                )
                return true
            } catch (uploadError) {
                handlePhotographWriteError(
                    uploadError,
                    setIsConflict,
                    'Photographs 이미지 업로드에 실패했습니다.',
                )
                return false
            } finally {
                operationLease.finish()
            }
        },
        [
            capabilities.canNavigate,
            etag,
            projectDraft,
            selectedSectionId,
            startOperation,
            getIdToken,
        ],
    )

    const manageProjectAssets = useCallback(
        async (update: PhotographAssetManagementUpdate): Promise<boolean> => {
            if (
                !etag ||
                !selectedSectionId ||
                !projectDraft ||
                update.sectionId !== selectedSectionId ||
                update.projectId !== projectDraft.id ||
                isNavigationBlocked
            ) {
                notifyNavigationBlockedMessage(hasChanges, isConflict)
                return false
            }

            const operationLease = startOperation({ kind: 'managing-assets' })
            if (!operationLease) return false

            try {
                const result = await managePhotographAssets(getIdToken, update, etag)
                setProjectDraft(result.project)
                setSavedSections((sections) =>
                    replacePhotographProject(sections, selectedSectionId, result.project),
                )
                setEtag(result.etag)

                if (result.assetCleanup.cleanupPending) {
                    toast.warning('이미지 변경은 저장됐지만 일부 R2 파일은 향후 정리가 필요합니다.')
                } else {
                    toast.success('이미지 변경사항이 저장되었습니다.')
                }
                return true
            } catch (managementError) {
                handlePhotographWriteError(
                    managementError,
                    setIsConflict,
                    'Photographs 이미지 관리에 실패했습니다.',
                )
                return false
            } finally {
                operationLease.finish()
            }
        },
        [
            etag,
            hasChanges,
            isConflict,
            isNavigationBlocked,
            projectDraft,
            selectedSectionId,
            startOperation,
            getIdToken,
        ],
    )

    const createProject = useCallback(
        async (creation: ProjectCreationInput): Promise<boolean> => {
            if (!selectedSectionId || !savedSection || !etag || isNavigationBlocked) {
                notifyNavigationBlockedMessage(hasChanges, isConflict)
                return false
            }

            const operationLease = startOperation({
                kind: 'creating-project',
                progress: null,
            })
            if (!operationLease) return false

            try {
                const [compressedHero] = await compressPhotographAssets(
                    [{ file: creation.heroFile, alt: creation.heroAlt }],
                    () => operationLease.updateProgress('대표 이미지 최적화 중'),
                )
                operationLease.updateProgress('소주제 저장 중')
                const result = await createPhotographProject(
                    getIdToken,
                    {
                        sectionId: selectedSectionId,
                        publication: creation.publication.trim(),
                        title: creation.title.trim(),
                        heroAlt: compressedHero.alt,
                        heroFile: compressedHero.file,
                    },
                    etag,
                )
                setSavedSections((sections) => replacePhotographSection(sections, result.section))
                setProjectOrderDraft(result.section.projects.map((project) => project.id))
                selectProjectDraft(result.project)
                setEtag(result.etag)
                toast.success(
                    `${result.project.title} 소주제가 ${result.section.title} 끝에 추가되었습니다.`,
                )
                return true
            } catch (createError) {
                handlePhotographWriteError(
                    createError,
                    setIsConflict,
                    'Photographs 소주제 생성에 실패했습니다.',
                )
                return false
            } finally {
                operationLease.finish()
            }
        },
        [
            etag,
            hasChanges,
            isConflict,
            isNavigationBlocked,
            savedSection,
            selectProjectDraft,
            selectedSectionId,
            startOperation,
            getIdToken,
        ],
    )

    const createSection = useCallback(
        async (creation: PhotographSectionCreation): Promise<boolean> => {
            if (!etag || isNavigationBlocked) {
                notifyNavigationBlockedMessage(hasChanges, isConflict)
                return false
            }

            const operationLease = startOperation({ kind: 'creating-section' })
            if (!operationLease) return false

            try {
                const result = await createPhotographSection(
                    getIdToken,
                    { title: creation.title.trim() },
                    etag,
                )
                setSavedSections((sections) => [...sections, result.section])
                setSectionOrderDraft((sectionIds) => [...sectionIds, result.section.id])
                selectSectionDraft(result.section)
                setEtag(result.etag)
                toast.success(`${result.section.title} 대주제가 추가되었습니다.`)
                return true
            } catch (createError) {
                handlePhotographWriteError(
                    createError,
                    setIsConflict,
                    'Photographs 대주제 생성에 실패했습니다.',
                )
                return false
            } finally {
                operationLease.finish()
            }
        },
        [
            etag,
            hasChanges,
            isConflict,
            isNavigationBlocked,
            selectSectionDraft,
            startOperation,
            getIdToken,
        ],
    )

    const renameSection = useCallback(
        async (sectionId: string, title: string): Promise<boolean> => {
            if (!etag || sectionId !== selectedSectionId || isNavigationBlocked) {
                notifyNavigationBlockedMessage(hasChanges, isConflict)
                return false
            }

            const operationLease = startOperation({ kind: 'renaming-section' })
            if (!operationLease) return false

            try {
                const result = await renamePhotographSection(
                    getIdToken,
                    { sectionId, title: title.trim() },
                    etag,
                )
                const renamedSection = result.sections.find((section) => section.id === sectionId)
                if (!renamedSection) {
                    throw new Error('수정된 대주제를 응답에서 찾을 수 없습니다.')
                }

                setSavedSections(result.sections)
                setSectionOrderDraft(result.sections.map((section) => section.id))
                selectSectionDraft(renamedSection, selectedProjectId)
                setEtag(result.etag)
                toast.success(`${renamedSection.title} 대주제 이름이 저장되었습니다.`)
                return true
            } catch (renameError) {
                handlePhotographWriteError(
                    renameError,
                    setIsConflict,
                    'Photographs 대주제 이름 수정에 실패했습니다.',
                )
                return false
            } finally {
                operationLease.finish()
            }
        },
        [
            etag,
            hasChanges,
            isConflict,
            isNavigationBlocked,
            selectSectionDraft,
            selectedProjectId,
            selectedSectionId,
            startOperation,
            getIdToken,
        ],
    )

    const deleteSection = useCallback(
        async (sectionId: string): Promise<boolean> => {
            if (!etag || sectionId !== selectedSectionId || isNavigationBlocked) {
                notifyNavigationBlockedMessage(hasChanges, isConflict)
                return false
            }

            const deletingSection = savedSections.find((section) => section.id === sectionId)
            if (!deletingSection || deletingSection.projects.length > 0) return false

            const operationLease = startOperation({ kind: 'deleting-section' })
            if (!operationLease) return false

            try {
                const result = await deletePhotographSection(getIdToken, { sectionId }, etag)
                const nextSelection = getSectionSelectionAfterDelete(
                    savedSections,
                    sectionId,
                    result.sections,
                )

                setSavedSections(result.sections)
                setSectionOrderDraft(result.sections.map((section) => section.id))
                if (nextSelection) {
                    selectSectionDraft(nextSelection)
                } else {
                    clearSelection()
                }
                setEtag(result.etag)
                toast.success(`${deletingSection.title} 대주제가 삭제되었습니다.`)
                return true
            } catch (deleteError) {
                handlePhotographWriteError(
                    deleteError,
                    setIsConflict,
                    'Photographs 대주제 삭제에 실패했습니다.',
                )
                return false
            } finally {
                operationLease.finish()
            }
        },
        [
            clearSelection,
            etag,
            hasChanges,
            isConflict,
            isNavigationBlocked,
            savedSections,
            selectSectionDraft,
            selectedSectionId,
            startOperation,
            getIdToken,
        ],
    )

    const deleteProject = useCallback(
        async (projectId: string): Promise<boolean> => {
            if (
                !etag ||
                !selectedSectionId ||
                projectId !== selectedProjectId ||
                isNavigationBlocked
            ) {
                notifyNavigationBlockedMessage(hasChanges, isConflict)
                return false
            }

            const deletingProject = savedSection?.projects.find(
                (project) => project.id === projectId,
            )
            if (!savedSection || !deletingProject) return false

            const operationLease = startOperation({ kind: 'deleting-project' })
            if (!operationLease) return false

            try {
                const result = await deletePhotographProject(
                    getIdToken,
                    { sectionId: selectedSectionId, projectId },
                    etag,
                )
                if (result.deletedProjectId !== projectId) {
                    throw new Error('삭제된 소주제 식별자가 요청과 일치하지 않습니다.')
                }

                const nextProject = getProjectSelectionAfterDelete(
                    savedSection.projects,
                    projectId,
                    result.section.projects,
                )
                setSavedSections((sections) => replacePhotographSection(sections, result.section))
                setProjectOrderDraft(result.section.projects.map((project) => project.id))
                selectProjectDraft(nextProject)
                setEtag(result.etag)

                if (result.assetCleanup.cleanupPending) {
                    toast.warning(
                        `${deletingProject.title} 소주제는 삭제됐지만 일부 R2 파일은 향후 정리가 필요합니다.`,
                    )
                } else {
                    toast.success(`${deletingProject.title} 소주제가 삭제되었습니다.`)
                }
                return true
            } catch (deleteError) {
                handlePhotographWriteError(
                    deleteError,
                    setIsConflict,
                    'Photographs 소주제 삭제에 실패했습니다.',
                )
                return false
            } finally {
                operationLease.finish()
            }
        },
        [
            etag,
            hasChanges,
            isConflict,
            isNavigationBlocked,
            savedSection,
            selectProjectDraft,
            selectedProjectId,
            selectedSectionId,
            startOperation,
            getIdToken,
        ],
    )

    return {
        loadState: isLoading
            ? { kind: 'loading' }
            : error
              ? { kind: 'error', message: error, onRetry: loadPhotographs }
              : { kind: 'ready' },
        sectionNavigation: {
            sections: orderedSections,
            selectedSectionId,
            hasOrderChanges: hasSectionOrderChanges,
            canReorder: !isSectionOrderEditingDisabled,
            onSelectSection: selectSection,
            onReorderSections: reorderSections,
        },
        projectNavigation: {
            selectedSectionId,
            sectionTitle: savedSection?.title ?? null,
            projects: orderedProjects,
            selectedProjectId,
            hasOrderChanges: hasProjectOrderChanges,
            canReorder: !isProjectOrderEditingDisabled,
            onSelectProject: selectProject,
            onReorderProjects: reorderProjects,
        },
        projectEditor: {
            projectDraft,
            canEdit: capabilities.canEditProject,
            onChangeProjectDraft: updateProjectDraft,
        },
        changeActions: {
            hasProjectChanges,
            hasProjectOrderChanges,
            hasSectionOrderChanges,
            changeMode,
            isSaving,
            canSave: capabilities.canSaveChanges,
            canReset: capabilities.canResetChanges,
            onSaveChanges: saveChanges,
            onResetChanges: resetChanges,
        },
        navigationGuard: {
            isBlocked: isNavigationBlocked,
            onNavigationBlocked: notifyNavigationBlocked,
        },
        workspaceStatus: {
            isConflict,
            onReloadPhotographs: loadPhotographs,
        },
        sectionCommands: {
            selectedSection: savedSection,
            isCreating: isCreatingSection,
            isManaging: isManagingSection,
            onCreateSection: createSection,
            onRenameSection: renameSection,
            onDeleteSection: deleteSection,
        },
        projectCommands: {
            selectedProject: savedProject,
            sectionTitle: savedSection?.title ?? 'Photographs',
            isCreating: isCreatingProject,
            isManaging: isManagingProject,
            creationProgress: projectCreateProgress,
            onCreateProject: createProject,
            onDeleteProject: deleteProject,
        },
        assetCommands: {
            selectedSectionId,
            selectedProject: savedProject,
            hasUnsavedChanges: hasChanges,
            isUploading: isUploadingAsset,
            isManaging: isManagingAssets,
            uploadProgress: assetUploadProgress,
            onUploadProjectAssets: uploadProjectAssets,
            onManageProjectAssets: manageProjectAssets,
        },
    }
}

function notifyNavigationBlockedMessage(hasChanges: boolean, isConflict: boolean) {
    if (hasChanges) {
        toast.error('현재 변경사항을 저장하거나 취소한 뒤 다른 대·소주제로 이동해 주세요.')
        return
    }
    if (isConflict) {
        toast.error('최신 내용을 다시 불러온 뒤 대·소주제를 변경해 주세요.')
        return
    }
    toast.error('현재 작업이 끝난 뒤 다시 시도해 주세요.')
}

function notifyOrderEditingBlocked(hasOtherChanges: boolean, isConflict: boolean) {
    if (hasOtherChanges) {
        toast.error('현재 변경사항을 저장하거나 취소한 뒤 순서를 바꿔 주세요.')
        return
    }
    if (isConflict) {
        toast.error('최신 내용을 다시 불러온 뒤 순서를 바꿔 주세요.')
        return
    }
    toast.error('현재 작업이 끝난 뒤 순서를 바꿔 주세요.')
}

function handlePhotographWriteError(
    writeError: unknown,
    setIsConflict: (isConflict: boolean) => void,
    fallbackMessage: string,
) {
    if (writeError instanceof PhotographApiError && writeError.status === 412) {
        setIsConflict(true)
    }
    toast.error(writeError instanceof Error ? writeError.message : fallbackMessage)
}

function serializeEditableProject(project: PhotographProjectMetadata): string {
    return JSON.stringify({
        publication: project.publication,
        title: project.title,
        textPosition: project.textPosition,
        heroImageId: project.heroImageId,
        galleryImageIds: project.galleryImageIds,
    })
}

function isValidProjectText(value: string): boolean {
    const text = value.trim()
    return text.length > 0 && text.length <= 120
}
