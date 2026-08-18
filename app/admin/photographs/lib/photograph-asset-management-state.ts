import type {
    PhotographAssetManagementUpdate,
    PhotographProjectMetadata,
} from '@/lib/apis/photographs/types'

export interface PhotographAssetManagementDraft {
    altsByImageId: Record<string, string>
    deletedImageIds: string[]
}

export interface PhotographAssetManagementState {
    hasChanges: boolean
    isValid: boolean
    editedAltCount: number
    deletedImageCount: number
    firstInvalidImageId: string | null
}

export type PhotographAssetUsage = 'hero' | 'gallery' | 'unused'

export function createPhotographAssetManagementDraft(
    project: PhotographProjectMetadata,
): PhotographAssetManagementDraft {
    return {
        altsByImageId: Object.fromEntries(project.images.map((image) => [image.id, image.alt])),
        deletedImageIds: [],
    }
}

export function updatePhotographAssetAlt(
    draft: PhotographAssetManagementDraft,
    imageId: string,
    alt: string,
): PhotographAssetManagementDraft {
    if (!(imageId in draft.altsByImageId)) return draft
    return {
        ...draft,
        altsByImageId: { ...draft.altsByImageId, [imageId]: alt },
    }
}

export function togglePhotographAssetDeletion(
    project: PhotographProjectMetadata,
    draft: PhotographAssetManagementDraft,
    imageId: string,
): PhotographAssetManagementDraft {
    if (imageId === project.heroImageId || !(imageId in draft.altsByImageId)) return draft
    const isDeleted = draft.deletedImageIds.includes(imageId)
    return {
        ...draft,
        deletedImageIds: isDeleted
            ? draft.deletedImageIds.filter((id) => id !== imageId)
            : [...draft.deletedImageIds, imageId],
    }
}

export function getPhotographAssetManagementState(
    project: PhotographProjectMetadata,
    draft: PhotographAssetManagementDraft,
): PhotographAssetManagementState {
    const deletedIds = new Set(draft.deletedImageIds)
    const invalidImage = project.images.find((image) => {
        if (deletedIds.has(image.id)) return false
        const alt = draft.altsByImageId[image.id]?.trim() ?? ''
        return alt.length === 0 || alt.length > 240
    })
    const editedAltCount = project.images.filter(
        (image) =>
            !deletedIds.has(image.id) &&
            (draft.altsByImageId[image.id]?.trim() ?? '') !== image.alt,
    ).length
    const deletedImageCount = project.images.filter((image) => deletedIds.has(image.id)).length

    return {
        hasChanges: editedAltCount > 0 || deletedImageCount > 0,
        isValid:
            !invalidImage &&
            !deletedIds.has(project.heroImageId) &&
            deletedImageCount === draft.deletedImageIds.length,
        editedAltCount,
        deletedImageCount,
        firstInvalidImageId: invalidImage?.id ?? null,
    }
}

export function createPhotographAssetManagementUpdate(
    sectionId: string,
    project: PhotographProjectMetadata,
    draft: PhotographAssetManagementDraft,
): PhotographAssetManagementUpdate {
    const deletedIds = new Set(draft.deletedImageIds)
    return {
        sectionId,
        projectId: project.id,
        retainedImageAlts: project.images
            .filter((image) => !deletedIds.has(image.id))
            .map((image) => ({
                imageId: image.id,
                alt: draft.altsByImageId[image.id].trim(),
            })),
        deletedImageIds: project.images
            .filter((image) => deletedIds.has(image.id))
            .map((image) => image.id),
    }
}

export function getPhotographAssetUsage(
    project: PhotographProjectMetadata,
    imageId: string,
): PhotographAssetUsage[] {
    const usage: PhotographAssetUsage[] = []
    if (project.heroImageId === imageId) usage.push('hero')
    if (project.galleryImageIds.includes(imageId)) usage.push('gallery')
    return usage.length > 0 ? usage : ['unused']
}
