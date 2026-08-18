import type {
    PhotographManifest,
    PhotographSectionMetadata,
    PhotographSectionRename,
} from '../../lib/apis/photographs/types'
import {
    normalizePhotographSectionTitle,
    parsePhotographSectionId,
    parsePhotographSectionTitle,
} from './photograph-section-fields'
import {
    getPhotographManifestSnapshot,
    photographEtagsMatch,
    putPhotographManifest,
} from './photographs-r2'

type PhotographSectionRenameApplyResult =
    | {
          ok: true
          manifest: PhotographManifest
          sections: PhotographSectionMetadata[]
          hasChanges: boolean
      }
    | { ok: false; error: string; status: 404 | 409 }

type PhotographSectionRenameStoreResult =
    | {
          ok: true
          sections: PhotographSectionMetadata[]
          httpEtag: string
          status: 200
      }
    | { ok: false; error: string; status: 404 | 409 | 412 }

export function parsePhotographSectionRename(value: unknown): PhotographSectionRename | null {
    if (!isRecord(value)) return null
    const sectionId = parsePhotographSectionId(value.sectionId)
    const title = parsePhotographSectionTitle(value.title)
    return sectionId && title ? { sectionId, title } : null
}

export async function storePhotographSectionRename(
    bucket: R2Bucket,
    env: Env,
    expectedEtag: string,
    rename: PhotographSectionRename,
): Promise<PhotographSectionRenameStoreResult> {
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

    const applyResult = applyPhotographSectionRename(snapshot.manifest, rename)
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

export function applyPhotographSectionRename(
    manifest: PhotographManifest,
    rename: PhotographSectionRename,
): PhotographSectionRenameApplyResult {
    const sectionIndex = manifest.sections.findIndex((section) => section.id === rename.sectionId)
    if (sectionIndex < 0) {
        return { ok: false, error: '이름을 바꿀 대주제를 찾을 수 없습니다.', status: 404 }
    }

    const section = manifest.sections[sectionIndex]
    if (section.title === rename.title) {
        return { ok: true, manifest, sections: manifest.sections, hasChanges: false }
    }

    const normalizedTitle = normalizePhotographSectionTitle(rename.title)
    const hasDuplicateTitle = manifest.sections.some(
        (item) =>
            item.id !== rename.sectionId &&
            normalizePhotographSectionTitle(item.title) === normalizedTitle,
    )
    if (hasDuplicateTitle) {
        return { ok: false, error: '같은 이름의 대주제가 이미 있습니다.', status: 409 }
    }

    const renamedSection: PhotographSectionMetadata = { ...section, title: rename.title }
    const sections = manifest.sections.map((item, index) =>
        index === sectionIndex ? renamedSection : item,
    )
    return {
        ok: true,
        manifest: { ...manifest, sections },
        sections,
        hasChanges: true,
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}
