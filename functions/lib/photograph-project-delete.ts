import type {
    PhotographAssetCleanupResult,
    PhotographManifest,
    PhotographProjectDeletion,
    PhotographProjectMetadata,
    PhotographSectionMetadata,
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

type PhotographProjectDeleteApplyResult =
    | {
          ok: true
          manifest: PhotographManifest
          section: PhotographSectionMetadata
          deletedProject: PhotographProjectMetadata
          cleanupCandidateObjectKeys: string[]
      }
    | { ok: false; error: string; status: 404 }

type PhotographProjectDeleteStoreResult =
    | {
          ok: true
          section: PhotographSectionMetadata
          deletedProjectId: string
          assetCleanup: PhotographAssetCleanupResult
          httpEtag: string
          status: 200
      }
    | { ok: false; error: string; status: 404 | 412 }

export function parsePhotographProjectDeletion(value: unknown): PhotographProjectDeletion | null {
    if (!isRecord(value)) return null
    const sectionId = parseIdentifier(value.sectionId)
    const projectId = parseIdentifier(value.projectId)
    return sectionId && projectId ? { sectionId, projectId } : null
}

export async function storePhotographProjectDeletion(
    bucket: R2Bucket,
    env: Env,
    expectedEtag: string,
    deletion: PhotographProjectDeletion,
    cleanupOptions: PhotographAssetCleanupOptions = {},
): Promise<PhotographProjectDeleteStoreResult> {
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

    const applyResult = applyPhotographProjectDeletion(snapshot.manifest, deletion)
    if (!applyResult.ok) return applyResult

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
    const assetCleanup = cleanupExecution.result
    if (assetCleanup.cleanupPending) {
        console.error('Photographs 소주제 삭제 후 R2 정리 미완료:', {
            sectionId: deletion.sectionId,
            projectId: deletion.projectId,
            candidateCount: assetCleanup.candidateCount,
            confirmedDeletedCount: assetCleanup.confirmedDeletedCount,
            failedObjectKeys: cleanupExecution.failedObjectKeys,
        })
    }

    return {
        ok: true,
        section: applyResult.section,
        deletedProjectId: applyResult.deletedProject.id,
        assetCleanup,
        httpEtag: storedSnapshot.httpEtag,
        status: 200,
    }
}

export function applyPhotographProjectDeletion(
    manifest: PhotographManifest,
    deletion: PhotographProjectDeletion,
): PhotographProjectDeleteApplyResult {
    const sectionIndex = manifest.sections.findIndex((section) => section.id === deletion.sectionId)
    if (sectionIndex < 0) {
        return { ok: false, error: '삭제할 소주제의 대주제를 찾을 수 없습니다.', status: 404 }
    }

    const section = manifest.sections[sectionIndex]
    const projectIndex = section.projects.findIndex((project) => project.id === deletion.projectId)
    if (projectIndex < 0) {
        return { ok: false, error: '삭제할 소주제를 찾을 수 없습니다.', status: 404 }
    }

    const deletedProject = section.projects[projectIndex]
    const updatedSection: PhotographSectionMetadata = {
        ...section,
        projects: section.projects.filter((project) => project.id !== deletion.projectId),
    }
    const updatedManifest: PhotographManifest = {
        ...manifest,
        sections: manifest.sections.map((currentSection, index) =>
            index === sectionIndex ? updatedSection : currentSection,
        ),
    }
    const cleanupCandidateObjectKeys = getUnreferencedPhotographObjectKeys(
        updatedManifest,
        deletedProject.images,
    )

    return {
        ok: true,
        manifest: updatedManifest,
        section: updatedSection,
        deletedProject,
        cleanupCandidateObjectKeys,
    }
}

function parseIdentifier(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const identifier = value.trim()
    return identifier.length > 0 && identifier.length <= 120 ? identifier : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}
