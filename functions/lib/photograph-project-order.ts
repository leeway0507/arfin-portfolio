import type {
    PhotographManifest,
    PhotographProjectOrderUpdate,
    PhotographSectionMetadata,
} from '../../lib/apis/photographs/types'
import {
    getPhotographManifestSnapshot,
    photographEtagsMatch,
    putPhotographManifest,
} from './photographs-r2'

type PhotographProjectOrderApplyResult =
    | {
          ok: true
          manifest: PhotographManifest
          section: PhotographSectionMetadata
          hasChanges: boolean
      }
    | { ok: false; error: string; status: 400 | 404 }

type PhotographProjectOrderStoreResult =
    | {
          ok: true
          section: PhotographSectionMetadata
          httpEtag: string
          status: 200
      }
    | { ok: false; error: string; status: 400 | 404 | 412 }

export function parsePhotographProjectOrderUpdate(
    value: unknown,
): PhotographProjectOrderUpdate | null {
    if (!isRecord(value)) return null

    const sectionId = parseRequiredText(value.sectionId, 120)
    if (
        !sectionId ||
        !Array.isArray(value.projectIds) ||
        value.projectIds.length === 0 ||
        value.projectIds.length > MAX_PROJECTS_PER_SECTION ||
        !value.projectIds.every(isNonEmptyString) ||
        new Set(value.projectIds).size !== value.projectIds.length
    ) {
        return null
    }

    return { sectionId, projectIds: value.projectIds }
}

export async function storePhotographProjectOrder(
    bucket: R2Bucket,
    env: Env,
    expectedEtag: string,
    update: PhotographProjectOrderUpdate,
): Promise<PhotographProjectOrderStoreResult> {
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

    const applyResult = applyPhotographProjectOrder(snapshot.manifest, update)
    if (!applyResult.ok) return applyResult
    if (!applyResult.hasChanges) {
        return {
            ok: true,
            section: applyResult.section,
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

    return {
        ok: true,
        section: applyResult.section,
        httpEtag: storedSnapshot.httpEtag,
        status: 200,
    }
}

export function applyPhotographProjectOrder(
    manifest: PhotographManifest,
    update: PhotographProjectOrderUpdate,
): PhotographProjectOrderApplyResult {
    const sectionIndex = manifest.sections.findIndex((section) => section.id === update.sectionId)
    if (sectionIndex < 0) {
        return { ok: false, error: '순서를 바꿀 대주제를 찾을 수 없습니다.', status: 404 }
    }

    const section = manifest.sections[sectionIndex]
    const currentProjectIds = section.projects.map((project) => project.id)
    if (!isExactProjectPermutation(currentProjectIds, update.projectIds)) {
        return {
            ok: false,
            error: '소주제 순서는 현재 소주제를 중복이나 누락 없이 포함해야 합니다.',
            status: 400,
        }
    }

    const hasChanges = !arraysEqual(currentProjectIds, update.projectIds)
    if (!hasChanges) {
        return { ok: true, manifest, section, hasChanges: false }
    }

    const projectById = new Map(section.projects.map((project) => [project.id, project]))
    const updatedSection: PhotographSectionMetadata = {
        ...section,
        projects: update.projectIds.map((projectId) => projectById.get(projectId)!),
    }
    const updatedManifest: PhotographManifest = {
        ...manifest,
        sections: manifest.sections.map((currentSection, index) =>
            index === sectionIndex ? updatedSection : currentSection,
        ),
    }

    return { ok: true, manifest: updatedManifest, section: updatedSection, hasChanges: true }
}

function isExactProjectPermutation(currentIds: string[], nextIds: string[]): boolean {
    if (currentIds.length !== nextIds.length || new Set(nextIds).size !== nextIds.length) {
        return false
    }
    const currentIdSet = new Set(currentIds)
    return nextIds.every((projectId) => currentIdSet.has(projectId))
}

function arraysEqual(left: string[], right: string[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index])
}

function parseRequiredText(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') return null
    const text = value.trim()
    return text.length > 0 && text.length <= maxLength ? text : null
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

const MAX_PROJECTS_PER_SECTION = 200
