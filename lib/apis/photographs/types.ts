export interface PhotographImageMetadata {
    id: string
    objectKey: string
    alt: string
    width: number
    height: number
}

export type PhotographTextPosition = 'left' | 'right'
export type PhotographAssetTarget = 'hero' | 'gallery'

export interface PhotographProjectMetadata {
    id: string
    publication: string
    title: string
    textPosition: PhotographTextPosition
    heroImageId: string
    galleryImageIds: string[]
    images: PhotographImageMetadata[]
}

export interface PhotographSectionMetadata {
    id: string
    title: string
    projects: PhotographProjectMetadata[]
}

export interface PhotographManifest {
    version: 2
    sections: PhotographSectionMetadata[]
}

export interface PhotographManifestSnapshot {
    manifest: PhotographManifest
    etag: string
}

export interface PhotographProjectUpdate {
    sectionId: string
    projectId: string
    publication: string
    title: string
    textPosition: PhotographTextPosition
    heroImageId: string
    galleryImageIds: string[]
}

export interface PhotographProjectCreation {
    sectionId: string
    publication: string
    title: string
    heroAlt: string
    heroFile: File
}

export interface PhotographProjectOrderUpdate {
    sectionId: string
    projectIds: string[]
}

export interface PhotographProjectDeletion {
    sectionId: string
    projectId: string
}

export interface PhotographAssetCleanupResult {
    status: 'not-needed' | 'completed' | 'incomplete'
    candidateCount: number
    confirmedDeletedCount: number
    cleanupPending: boolean
}

export interface PhotographSectionCreation {
    title: string
}

export interface PhotographSectionRename {
    sectionId: string
    title: string
}

export interface PhotographSectionDeletion {
    sectionId: string
}

export interface PhotographSectionOrderUpdate {
    sectionIds: string[]
}

export interface PhotographAssetUploadItem {
    alt: string
    file: File
}

export interface PhotographAssetUpload {
    sectionId: string
    projectId: string
    target: PhotographAssetTarget
    assets: PhotographAssetUploadItem[]
}

export interface PhotographRetainedImageAlt {
    imageId: string
    alt: string
}

export interface PhotographAssetManagementUpdate {
    sectionId: string
    projectId: string
    retainedImageAlts: PhotographRetainedImageAlt[]
    deletedImageIds: string[]
}

export interface PhotographImage extends PhotographImageMetadata {
    imageUrl: string
}

export interface PhotographProject extends Omit<PhotographProjectMetadata, 'images'> {
    images: PhotographImage[]
}

export interface PhotographSection extends Omit<PhotographSectionMetadata, 'projects'> {
    projects: PhotographProject[]
}
