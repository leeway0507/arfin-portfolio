import type {
    PhotographAssetManagementUpdate,
    PhotographAssetTarget,
    PhotographAssetUploadItem,
    PhotographProjectCreation,
    PhotographProjectMetadata,
    PhotographSectionCreation,
    PhotographSectionMetadata,
} from '@/lib/apis/photographs/types'

export type PhotographManagementChangeMode = 'project' | 'project-order' | 'section-order' | null

export type PhotographManagementLoadState =
    | { kind: 'loading' }
    | { kind: 'error'; message: string; onRetry: () => void }
    | { kind: 'ready' }

export interface PhotographSectionNavigationModel {
    sections: PhotographSectionMetadata[]
    selectedSectionId: string | null
    hasOrderChanges: boolean
    canReorder: boolean
    onSelectSection: (sectionId: string) => void
    onReorderSections: (activeSectionId: string, overSectionId: string) => void
}

export interface PhotographProjectNavigationModel {
    selectedSectionId: string | null
    sectionTitle: string | null
    projects: PhotographProjectMetadata[]
    selectedProjectId: string | null
    hasOrderChanges: boolean
    canReorder: boolean
    onSelectProject: (projectId: string) => void
    onReorderProjects: (activeProjectId: string, overProjectId: string) => void
}

export interface PhotographProjectEditorModel {
    projectDraft: PhotographProjectMetadata | null
    canEdit: boolean
    onChangeProjectDraft: (
        updateProject: (project: PhotographProjectMetadata) => PhotographProjectMetadata,
    ) => void
}

export interface PhotographChangeActionsModel {
    hasProjectChanges: boolean
    hasProjectOrderChanges: boolean
    hasSectionOrderChanges: boolean
    changeMode: PhotographManagementChangeMode
    isSaving: boolean
    canSave: boolean
    canReset: boolean
    onSaveChanges: () => void
    onResetChanges: () => void
}

export interface PhotographNavigationGuardModel {
    isBlocked: boolean
    onNavigationBlocked: () => void
}

export interface PhotographWorkspaceStatusModel {
    isConflict: boolean
    onReloadPhotographs: () => void
}

export interface PhotographSectionCommandsModel {
    selectedSection: PhotographSectionMetadata | null
    isCreating: boolean
    isManaging: boolean
    onCreateSection: (creation: PhotographSectionCreation) => Promise<boolean>
    onRenameSection: (sectionId: string, title: string) => Promise<boolean>
    onDeleteSection: (sectionId: string) => Promise<boolean>
}

export interface PhotographProjectCommandsModel {
    selectedProject: PhotographProjectMetadata | null
    sectionTitle: string
    isCreating: boolean
    isManaging: boolean
    creationProgress: string | null
    onCreateProject: (creation: Omit<PhotographProjectCreation, 'sectionId'>) => Promise<boolean>
    onDeleteProject: (projectId: string) => Promise<boolean>
}

export interface PhotographAssetCommandsModel {
    selectedSectionId: string | null
    selectedProject: PhotographProjectMetadata | null
    hasUnsavedChanges: boolean
    isUploading: boolean
    isManaging: boolean
    uploadProgress: string | null
    onUploadProjectAssets: (
        target: PhotographAssetTarget,
        assets: PhotographAssetUploadItem[],
    ) => Promise<boolean>
    onManageProjectAssets: (update: PhotographAssetManagementUpdate) => Promise<boolean>
}

export interface PhotographsManagementModels {
    loadState: PhotographManagementLoadState
    sectionNavigation: PhotographSectionNavigationModel
    projectNavigation: PhotographProjectNavigationModel
    projectEditor: PhotographProjectEditorModel
    changeActions: PhotographChangeActionsModel
    navigationGuard: PhotographNavigationGuardModel
    workspaceStatus: PhotographWorkspaceStatusModel
    sectionCommands: PhotographSectionCommandsModel
    projectCommands: PhotographProjectCommandsModel
    assetCommands: PhotographAssetCommandsModel
}
