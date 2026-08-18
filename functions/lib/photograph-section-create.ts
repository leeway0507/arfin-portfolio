import type {
    PhotographManifest,
    PhotographSectionCreation,
    PhotographSectionMetadata,
} from '../../lib/apis/photographs/types'
import {
    getPhotographManifestSnapshot,
    photographEtagsMatch,
    putPhotographManifest,
} from './photographs-r2'
import { MAX_PHOTOGRAPH_SECTIONS } from './photograph-constraints'
import {
    normalizePhotographSectionTitle,
    parsePhotographSectionTitle,
} from './photograph-section-fields'

type PhotographSectionCreateApplyResult =
    | {
          ok: true
          manifest: PhotographManifest
          section: PhotographSectionMetadata
      }
    | { ok: false; error: string; status: 409 }

type PhotographSectionCreateStoreResult =
    | {
          ok: true
          section: PhotographSectionMetadata
          httpEtag: string
          status: 201
      }
    | { ok: false; error: string; status: 404 | 409 | 412 }

export function parsePhotographSectionCreation(value: unknown): PhotographSectionCreation | null {
    if (!isRecord(value)) return null
    const title = parsePhotographSectionTitle(value.title)
    return title ? { title } : null
}

export async function storePhotographSectionCreation(
    bucket: R2Bucket,
    env: Env,
    expectedEtag: string,
    creation: PhotographSectionCreation,
    createUuid: () => string = () => crypto.randomUUID(),
): Promise<PhotographSectionCreateStoreResult> {
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

    const sectionId = createUniqueSectionId(snapshot.manifest, createUuid)
    if (!sectionId) {
        return { ok: false, error: '고유한 대주제 식별자를 만들지 못했습니다.', status: 409 }
    }

    const applyResult = applyPhotographSectionCreation(snapshot.manifest, {
        id: sectionId,
        title: creation.title,
    })
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
        section: applyResult.section,
        httpEtag: storedSnapshot.httpEtag,
        status: 201,
    }
}

export function applyPhotographSectionCreation(
    manifest: PhotographManifest,
    creation: Pick<PhotographSectionMetadata, 'id' | 'title'>,
): PhotographSectionCreateApplyResult {
    if (manifest.sections.length >= MAX_PHOTOGRAPH_SECTIONS) {
        return {
            ok: false,
            error: `대주제는 최대 ${MAX_PHOTOGRAPH_SECTIONS}개까지 만들 수 있습니다.`,
            status: 409,
        }
    }

    const normalizedTitle = normalizePhotographSectionTitle(creation.title)
    const hasDuplicate = manifest.sections.some(
        (section) =>
            section.id === creation.id ||
            normalizePhotographSectionTitle(section.title) === normalizedTitle,
    )
    if (hasDuplicate) {
        return {
            ok: false,
            error: '같은 이름의 대주제가 있거나 식별자가 이미 사용 중입니다.',
            status: 409,
        }
    }

    const section: PhotographSectionMetadata = {
        id: creation.id,
        title: creation.title,
        projects: [],
    }
    return {
        ok: true,
        manifest: {
            ...manifest,
            sections: [...manifest.sections, section],
        },
        section,
    }
}

function createUniqueSectionId(
    manifest: PhotographManifest,
    createUuid: () => string,
): string | null {
    const sectionIds = new Set(manifest.sections.map((section) => section.id))
    for (let attempt = 0; attempt < MAX_UUID_ATTEMPTS; attempt += 1) {
        const sectionId = `section-${createUuid()}`
        if (!sectionIds.has(sectionId)) return sectionId
    }
    return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

const MAX_UUID_ATTEMPTS = 5
