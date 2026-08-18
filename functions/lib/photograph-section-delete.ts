import type {
    PhotographManifest,
    PhotographSectionDeletion,
    PhotographSectionMetadata,
} from '../../lib/apis/photographs/types'
import { parsePhotographSectionId } from './photograph-section-fields'
import {
    getPhotographManifestSnapshot,
    photographEtagsMatch,
    putPhotographManifest,
} from './photographs-r2'

type PhotographSectionDeleteApplyResult =
    | {
          ok: true
          manifest: PhotographManifest
          sections: PhotographSectionMetadata[]
      }
    | { ok: false; error: string; status: 404 | 409 }

type PhotographSectionDeleteStoreResult =
    | {
          ok: true
          sections: PhotographSectionMetadata[]
          httpEtag: string
          status: 200
      }
    | { ok: false; error: string; status: 404 | 409 | 412 }

export function parsePhotographSectionDeletion(value: unknown): PhotographSectionDeletion | null {
    if (!isRecord(value)) return null
    const sectionId = parsePhotographSectionId(value.sectionId)
    return sectionId ? { sectionId } : null
}

export async function storePhotographSectionDeletion(
    bucket: R2Bucket,
    env: Env,
    expectedEtag: string,
    deletion: PhotographSectionDeletion,
): Promise<PhotographSectionDeleteStoreResult> {
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

    const applyResult = applyPhotographSectionDeletion(snapshot.manifest, deletion)
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

    return {
        ok: true,
        sections: applyResult.sections,
        httpEtag: storedSnapshot.httpEtag,
        status: 200,
    }
}

export function applyPhotographSectionDeletion(
    manifest: PhotographManifest,
    deletion: PhotographSectionDeletion,
): PhotographSectionDeleteApplyResult {
    const section = manifest.sections.find((item) => item.id === deletion.sectionId)
    if (!section) {
        return { ok: false, error: '삭제할 대주제를 찾을 수 없습니다.', status: 404 }
    }
    if (section.projects.length > 0) {
        return {
            ok: false,
            error: '소주제가 있는 대주제는 삭제할 수 없습니다.',
            status: 409,
        }
    }

    const sections = manifest.sections.filter((item) => item.id !== deletion.sectionId)
    return {
        ok: true,
        manifest: { ...manifest, sections },
        sections,
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}
