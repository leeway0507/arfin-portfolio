import type {
    PhotographManifest,
    PhotographSectionMetadata,
    PhotographSectionOrderUpdate,
} from '../../lib/apis/photographs/types'
import { MAX_PHOTOGRAPH_SECTIONS } from './photograph-constraints'
import {
    getPhotographManifestSnapshot,
    photographEtagsMatch,
    putPhotographManifest,
} from './photographs-r2'

type PhotographSectionOrderApplyResult =
    | {
          ok: true
          manifest: PhotographManifest
          sections: PhotographSectionMetadata[]
          hasChanges: boolean
      }
    | { ok: false; error: string; status: 400 }

type PhotographSectionOrderStoreResult =
    | {
          ok: true
          sections: PhotographSectionMetadata[]
          httpEtag: string
          status: 200
      }
    | { ok: false; error: string; status: 400 | 404 | 412 }

export function parsePhotographSectionOrderUpdate(
    value: unknown,
): PhotographSectionOrderUpdate | null {
    if (
        !isRecord(value) ||
        !Array.isArray(value.sectionIds) ||
        value.sectionIds.length === 0 ||
        value.sectionIds.length > MAX_PHOTOGRAPH_SECTIONS ||
        !value.sectionIds.every(isNonEmptyString) ||
        new Set(value.sectionIds).size !== value.sectionIds.length
    ) {
        return null
    }

    return { sectionIds: value.sectionIds }
}

export async function storePhotographSectionOrder(
    bucket: R2Bucket,
    env: Env,
    expectedEtag: string,
    update: PhotographSectionOrderUpdate,
): Promise<PhotographSectionOrderStoreResult> {
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

    const applyResult = applyPhotographSectionOrder(snapshot.manifest, update)
    if (!applyResult.ok) return applyResult
    if (!applyResult.hasChanges) {
        return {
            ok: true,
            sections: applyResult.sections,
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
        sections: applyResult.sections,
        httpEtag: storedSnapshot.httpEtag,
        status: 200,
    }
}

export function applyPhotographSectionOrder(
    manifest: PhotographManifest,
    update: PhotographSectionOrderUpdate,
): PhotographSectionOrderApplyResult {
    const currentSectionIds = manifest.sections.map((section) => section.id)
    if (!isExactSectionPermutation(currentSectionIds, update.sectionIds)) {
        return {
            ok: false,
            error: '대주제 순서는 현재 대주제를 중복이나 누락 없이 포함해야 합니다.',
            status: 400,
        }
    }

    const hasChanges = !arraysEqual(currentSectionIds, update.sectionIds)
    if (!hasChanges) {
        return {
            ok: true,
            manifest,
            sections: manifest.sections,
            hasChanges: false,
        }
    }

    const sectionById = new Map(manifest.sections.map((section) => [section.id, section]))
    const sections = update.sectionIds.map((sectionId) => sectionById.get(sectionId)!)
    return {
        ok: true,
        manifest: { ...manifest, sections },
        sections,
        hasChanges: true,
    }
}

function isExactSectionPermutation(currentIds: string[], nextIds: string[]): boolean {
    if (currentIds.length !== nextIds.length || new Set(nextIds).size !== nextIds.length) {
        return false
    }
    const currentIdSet = new Set(currentIds)
    return nextIds.every((sectionId) => currentIdSet.has(sectionId))
}

function arraysEqual(left: string[], right: string[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index])
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}
