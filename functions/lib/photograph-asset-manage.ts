import type {
    PhotographAssetCleanupResult,
    PhotographAssetManagementUpdate,
    PhotographManifest,
    PhotographProjectMetadata,
} from '../../lib/apis/photographs/types'
import {
    cleanupPhotographAssetObjectKeys,
    getUnreferencedPhotographObjectKeys,
    type PhotographAssetCleanupOptions,
} from './photograph-asset-cleanup'
import {
    getPhotographManifestSnapshot,
    photographEtagsMatch,
    putPhotographManifest,
} from './photographs-r2'

type PhotographAssetManagementApplyResult =
    | {
          ok: true
          manifest: PhotographManifest
          project: PhotographProjectMetadata
          cleanupCandidateObjectKeys: string[]
          hasChanges: boolean
      }
    | { ok: false; error: string; status: 400 | 404 }

type PhotographAssetManagementStoreResult =
    | {
          ok: true
          project: PhotographProjectMetadata
          assetCleanup: PhotographAssetCleanupResult
          httpEtag: string
          status: 200
      }
    | { ok: false; error: string; status: 400 | 404 | 412 }

export function parsePhotographAssetManagementUpdate(
    value: unknown,
): PhotographAssetManagementUpdate | null {
    if (!isRecord(value)) return null
    const sectionId = parseRequiredText(value.sectionId, 120)
    const projectId = parseRequiredText(value.projectId, 120)
    if (
        !sectionId ||
        !projectId ||
        !Array.isArray(value.retainedImageAlts) ||
        !Array.isArray(value.deletedImageIds)
    ) {
        return null
    }

    const retainedImageAlts = value.retainedImageAlts.map(parseRetainedImageAlt)
    const deletedImageIds = value.deletedImageIds.map((imageId) => parseRequiredText(imageId, 120))
    if (
        retainedImageAlts.some((image) => image === null) ||
        deletedImageIds.some((imageId) => imageId === null)
    ) {
        return null
    }

    const parsedRetainedImageAlts =
        retainedImageAlts as PhotographAssetManagementUpdate['retainedImageAlts']
    const parsedDeletedImageIds = deletedImageIds as string[]
    const retainedIds = parsedRetainedImageAlts.map((image) => image.imageId)
    if (
        retainedIds.length === 0 ||
        new Set(retainedIds).size !== retainedIds.length ||
        new Set(parsedDeletedImageIds).size !== parsedDeletedImageIds.length ||
        parsedDeletedImageIds.some((imageId) => retainedIds.includes(imageId))
    ) {
        return null
    }

    return {
        sectionId,
        projectId,
        retainedImageAlts: parsedRetainedImageAlts,
        deletedImageIds: parsedDeletedImageIds,
    }
}

export async function storePhotographAssetManagementUpdate(
    bucket: R2Bucket,
    env: Env,
    expectedEtag: string,
    update: PhotographAssetManagementUpdate,
    cleanupOptions: PhotographAssetCleanupOptions = {},
): Promise<PhotographAssetManagementStoreResult> {
    const snapshot = await getPhotographManifestSnapshot(bucket, env)
    if (!snapshot) {
        return { ok: false, error: 'Photographs manifest가 없습니다.', status: 404 }
    }
    if (!photographEtagsMatch(snapshot.httpEtag, expectedEtag)) {
        return {
            ok: false,
            error: '다른 곳에서 먼저 수정했습니다. 새로 불러온 뒤 다시 시도해 주세요.',
            status: 412,
        }
    }

    const applyResult = applyPhotographAssetManagementUpdate(snapshot.manifest, update)
    if (!applyResult.ok) return applyResult
    if (!applyResult.hasChanges) {
        return {
            ok: true,
            project: applyResult.project,
            assetCleanup: createNoCleanupResult(),
            httpEtag: snapshot.httpEtag,
            status: 200,
        }
    }

    const storedSnapshot = await putPhotographManifest(
        bucket,
        env,
        applyResult.manifest,
        expectedEtag,
    )
    if (!storedSnapshot) {
        return {
            ok: false,
            error: '다른 곳에서 먼저 수정했습니다. 새로 불러온 뒤 다시 시도해 주세요.',
            status: 412,
        }
    }

    const cleanupExecution = await cleanupPhotographAssetObjectKeys(
        bucket,
        env,
        applyResult.cleanupCandidateObjectKeys,
        cleanupOptions,
    )
    if (cleanupExecution.result.cleanupPending) {
        console.error('Photographs 이미지 관리 후 R2 정리 미완료:', {
            sectionId: update.sectionId,
            projectId: update.projectId,
            candidateCount: cleanupExecution.result.candidateCount,
            confirmedDeletedCount: cleanupExecution.result.confirmedDeletedCount,
            failedObjectKeys: cleanupExecution.failedObjectKeys,
        })
    }

    return {
        ok: true,
        project: applyResult.project,
        assetCleanup: cleanupExecution.result,
        httpEtag: storedSnapshot.httpEtag,
        status: 200,
    }
}

export function applyPhotographAssetManagementUpdate(
    manifest: PhotographManifest,
    update: PhotographAssetManagementUpdate,
): PhotographAssetManagementApplyResult {
    const sectionIndex = manifest.sections.findIndex((section) => section.id === update.sectionId)
    if (sectionIndex < 0) {
        return { ok: false, error: '이미지를 관리할 대주제를 찾을 수 없습니다.', status: 404 }
    }
    const section = manifest.sections[sectionIndex]
    const projectIndex = section.projects.findIndex((project) => project.id === update.projectId)
    if (projectIndex < 0) {
        return { ok: false, error: '이미지를 관리할 소주제를 찾을 수 없습니다.', status: 404 }
    }

    const project = section.projects[projectIndex]
    const currentImageIds = new Set(project.images.map((image) => image.id))
    const retainedAltById = new Map(
        update.retainedImageAlts.map((image) => [image.imageId, image.alt]),
    )
    const retainedIds = new Set(retainedAltById.keys())
    const deletedIds = new Set(update.deletedImageIds)
    if (
        retainedIds.size !== update.retainedImageAlts.length ||
        deletedIds.size !== update.deletedImageIds.length ||
        retainedIds.size + deletedIds.size !== currentImageIds.size ||
        Array.from(retainedIds).some((imageId) => !currentImageIds.has(imageId)) ||
        Array.from(deletedIds).some(
            (imageId) => !currentImageIds.has(imageId) || retainedIds.has(imageId),
        ) ||
        Array.from(currentImageIds).some(
            (imageId) => !retainedIds.has(imageId) && !deletedIds.has(imageId),
        )
    ) {
        return {
            ok: false,
            error: '유지·삭제할 이미지 구성이 현재 프로젝트와 일치하지 않습니다.',
            status: 400,
        }
    }
    if (!retainedIds.has(project.heroImageId) || deletedIds.has(project.heroImageId)) {
        return {
            ok: false,
            error: '상단 이미지는 교체하기 전에는 삭제할 수 없습니다.',
            status: 400,
        }
    }

    const removedImages = project.images.filter((image) => deletedIds.has(image.id))
    const updatedImages = project.images
        .filter((image) => retainedIds.has(image.id))
        .map((image) => ({ ...image, alt: retainedAltById.get(image.id)! }))
    const hasAltChanges = updatedImages.some(
        (image) =>
            project.images.find((currentImage) => currentImage.id === image.id)?.alt !== image.alt,
    )
    const hasChanges = removedImages.length > 0 || hasAltChanges
    if (!hasChanges) {
        return {
            ok: true,
            manifest,
            project,
            cleanupCandidateObjectKeys: [],
            hasChanges: false,
        }
    }

    const updatedProject: PhotographProjectMetadata = {
        ...project,
        images: updatedImages,
        galleryImageIds: project.galleryImageIds.filter((imageId) => !deletedIds.has(imageId)),
    }
    const updatedSection = {
        ...section,
        projects: section.projects.map((currentProject, index) =>
            index === projectIndex ? updatedProject : currentProject,
        ),
    }
    const updatedManifest: PhotographManifest = {
        ...manifest,
        sections: manifest.sections.map((currentSection, index) =>
            index === sectionIndex ? updatedSection : currentSection,
        ),
    }

    return {
        ok: true,
        manifest: updatedManifest,
        project: updatedProject,
        cleanupCandidateObjectKeys: getUnreferencedPhotographObjectKeys(
            updatedManifest,
            removedImages,
        ),
        hasChanges: true,
    }
}

function parseRetainedImageAlt(value: unknown): { imageId: string; alt: string } | null {
    if (!isRecord(value)) return null
    const imageId = parseRequiredText(value.imageId, 120)
    const alt = parseRequiredText(value.alt, 240)
    return imageId && alt ? { imageId, alt } : null
}

function parseRequiredText(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') return null
    const text = value.trim()
    return text.length > 0 && text.length <= maxLength ? text : null
}

function createNoCleanupResult(): PhotographAssetCleanupResult {
    return {
        status: 'not-needed',
        candidateCount: 0,
        confirmedDeletedCount: 0,
        cleanupPending: false,
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}
