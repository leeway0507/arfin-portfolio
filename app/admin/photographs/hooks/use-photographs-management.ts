'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
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
import { compressPhotographAssets } from '../lib/compress-photograph-assets'
import {
    getPhotographManagementChangeState,
    hasPhotographOrderChanges,
    mapProjectsToDraftOrder,
    mapSectionsToDraftOrder,
    movePhotographOrderId,
} from '../lib/photograph-order-state'
import {
    getPhotographWorkspaceSelection,
    getProjectSelectionAfterDelete,
    getSectionSelectionAfterDelete,
    getSectionProjectSelection,
    replacePhotographProject,
    replacePhotographSection,
} from '../lib/photographs-management-state'
import type { PhotographManagementChangeMode } from '../types'

type ProjectCreationInput = Omit<PhotographProjectCreation, 'sectionId'>

export function usePhotographsManagement() {
    const router = useRouter()
    const { user, isLoading: isAuthLoading, isAllowed, signOut } = useAuth()
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
    const [isSaving, setIsSaving] = useState(false)
    const [isUploadingAsset, setIsUploadingAsset] = useState(false)
    const [isCreatingProject, setIsCreatingProject] = useState(false)
    const [isCreatingSection, setIsCreatingSection] = useState(false)
    const [isManagingProject, setIsManagingProject] = useState(false)
    const [isManagingSection, setIsManagingSection] = useState(false)
    const [isManagingAssets, setIsManagingAssets] = useState(false)
    const [assetUploadProgress, setAssetUploadProgress] = useState<string | null>(null)
    const [projectCreateProgress, setProjectCreateProgress] = useState<string | null>(null)
    const [isConflict, setIsConflict] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isAuthLoading && (!user || !isAllowed)) {
            router.replace('/admin')
        }
    }, [isAuthLoading, user, isAllowed, router])

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
        if (!user || !isAllowed) return

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
    }, [user, isAllowed, clearSelection, selectSectionDraft])

    useEffect(() => {
        if (user && isAllowed) {
            loadPhotographs()
        }
    }, [user, isAllowed, loadPhotographs])

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
    const {
        changeMode,
        hasInvalidConcurrentChanges,
    }: {
        changeMode: PhotographManagementChangeMode
        hasInvalidConcurrentChanges: boolean
    } = getPhotographManagementChangeState({
        hasProjectChanges,
        hasProjectOrderChanges,
        hasSectionOrderChanges,
    })
    const hasChanges = hasProjectChanges || hasProjectOrderChanges || hasSectionOrderChanges
    const isDraftValid = Boolean(
        projectDraft &&
        isValidProjectText(projectDraft.publication) &&
        isValidProjectText(projectDraft.title),
    )
    const isWriteInProgress =
        isSaving ||
        isUploadingAsset ||
        isCreatingProject ||
        isCreatingSection ||
        isManagingProject ||
        isManagingSection ||
        isManagingAssets
    const isNavigationBlocked = hasChanges || isWriteInProgress || isConflict
    const isProjectOrderEditingDisabled =
        orderedProjects.length < 2 ||
        hasProjectChanges ||
        hasSectionOrderChanges ||
        isWriteInProgress ||
        isConflict
    const isSectionOrderEditingDisabled =
        orderedSections.length < 2 ||
        hasProjectChanges ||
        hasProjectOrderChanges ||
        isWriteInProgress ||
        isConflict

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
            if (
                hasProjectOrderChanges ||
                hasSectionOrderChanges ||
                isWriteInProgress ||
                isConflict
            ) {
                return
            }
            setProjectDraft((project) => (project ? updateProject(project) : project))
        },
        [hasProjectOrderChanges, hasSectionOrderChanges, isConflict, isWriteInProgress],
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
        if (
            !user ||
            !etag ||
            !hasChanges ||
            !changeMode ||
            hasInvalidConcurrentChanges ||
            isConflict ||
            isWriteInProgress
        ) {
            if (hasInvalidConcurrentChanges) {
                toast.error('서로 다른 종류의 변경사항을 각각 저장하거나 취소해 주세요.')
            }
            return
        }
        if (changeMode === 'project' && (!selectedSectionId || !projectDraft || !isDraftValid)) {
            return
        }
        if (changeMode === 'project-order' && !selectedSectionId) return

        setIsSaving(true)
        try {
            if (changeMode === 'section-order') {
                const result = await updatePhotographSectionOrder(
                    () => user.getIdToken(),
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
                    () => user.getIdToken(),
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
                () => user.getIdToken(),
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
            setIsSaving(false)
        }
    }, [
        changeMode,
        etag,
        hasChanges,
        hasInvalidConcurrentChanges,
        isConflict,
        isWriteInProgress,
        isDraftValid,
        projectOrderDraft,
        projectDraft,
        sectionOrderDraft,
        selectedProjectId,
        selectedSectionId,
        user,
    ])

    const resetChanges = useCallback(() => {
        if (isWriteInProgress) return
        if (hasInvalidConcurrentChanges) {
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
        hasInvalidConcurrentChanges,
        isWriteInProgress,
        savedProject,
        savedSection,
        savedSections,
    ])

    const uploadProjectAssets = useCallback(
        async (
            target: PhotographAssetTarget,
            assets: PhotographAssetUploadItem[],
        ): Promise<boolean> => {
            if (
                !user ||
                !selectedSectionId ||
                !projectDraft ||
                !etag ||
                hasChanges ||
                isConflict ||
                isWriteInProgress
            ) {
                return false
            }

            setIsUploadingAsset(true)
            try {
                const compressedAssets = await compressPhotographAssets(
                    assets,
                    (currentCount, totalCount) =>
                        setAssetUploadProgress(`최적화 중 ${currentCount}/${totalCount}`),
                )
                setAssetUploadProgress(`업로드 중 ${compressedAssets.length}장`)
                const result = await uploadPhotographAssets(
                    () => user.getIdToken(),
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
                setIsUploadingAsset(false)
                setAssetUploadProgress(null)
            }
        },
        [etag, hasChanges, isConflict, isWriteInProgress, projectDraft, selectedSectionId, user],
    )

    const manageProjectAssets = useCallback(
        async (update: PhotographAssetManagementUpdate): Promise<boolean> => {
            if (
                !user ||
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

            setIsManagingAssets(true)
            try {
                const result = await managePhotographAssets(() => user.getIdToken(), update, etag)
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
                setIsManagingAssets(false)
            }
        },
        [etag, hasChanges, isConflict, isNavigationBlocked, projectDraft, selectedSectionId, user],
    )

    const createProject = useCallback(
        async (creation: ProjectCreationInput): Promise<boolean> => {
            if (!user || !selectedSectionId || !savedSection || !etag || isNavigationBlocked) {
                notifyNavigationBlockedMessage(hasChanges, isConflict)
                return false
            }

            setIsCreatingProject(true)
            try {
                const [compressedHero] = await compressPhotographAssets(
                    [{ file: creation.heroFile, alt: creation.heroAlt }],
                    () => setProjectCreateProgress('대표 이미지 최적화 중'),
                )
                setProjectCreateProgress('소주제 저장 중')
                const result = await createPhotographProject(
                    () => user.getIdToken(),
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
                setIsCreatingProject(false)
                setProjectCreateProgress(null)
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
            user,
        ],
    )

    const createSection = useCallback(
        async (creation: PhotographSectionCreation): Promise<boolean> => {
            if (!user || !etag || isNavigationBlocked) {
                notifyNavigationBlockedMessage(hasChanges, isConflict)
                return false
            }

            setIsCreatingSection(true)
            try {
                const result = await createPhotographSection(
                    () => user.getIdToken(),
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
                setIsCreatingSection(false)
            }
        },
        [etag, hasChanges, isConflict, isNavigationBlocked, selectSectionDraft, user],
    )

    const renameSection = useCallback(
        async (sectionId: string, title: string): Promise<boolean> => {
            if (!user || !etag || sectionId !== selectedSectionId || isNavigationBlocked) {
                notifyNavigationBlockedMessage(hasChanges, isConflict)
                return false
            }

            setIsManagingSection(true)
            try {
                const result = await renamePhotographSection(
                    () => user.getIdToken(),
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
                setIsManagingSection(false)
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
            user,
        ],
    )

    const deleteSection = useCallback(
        async (sectionId: string): Promise<boolean> => {
            if (!user || !etag || sectionId !== selectedSectionId || isNavigationBlocked) {
                notifyNavigationBlockedMessage(hasChanges, isConflict)
                return false
            }

            const deletingSection = savedSections.find((section) => section.id === sectionId)
            if (!deletingSection || deletingSection.projects.length > 0) return false

            setIsManagingSection(true)
            try {
                const result = await deletePhotographSection(
                    () => user.getIdToken(),
                    { sectionId },
                    etag,
                )
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
                setIsManagingSection(false)
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
            user,
        ],
    )

    const deleteProject = useCallback(
        async (projectId: string): Promise<boolean> => {
            if (
                !user ||
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

            setIsManagingProject(true)
            try {
                const result = await deletePhotographProject(
                    () => user.getIdToken(),
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
                setIsManagingProject(false)
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
            user,
        ],
    )

    return {
        sections: orderedSections,
        selectedSectionId,
        sectionTitle: savedSection?.title ?? null,
        projects: orderedProjects,
        selectedProjectId,
        projectDraft,
        updateProjectDraft,
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
        uploadProjectAssets,
        manageProjectAssets,
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
