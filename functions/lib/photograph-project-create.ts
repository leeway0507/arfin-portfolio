import type {
    PhotographImageMetadata,
    PhotographManifest,
    PhotographProjectMetadata,
    PhotographSectionMetadata,
} from '../../lib/apis/photographs/types'
import {
    parsePhotographImageUpload,
    type ParsedPhotographImageUpload,
} from './photograph-image-upload'
import {
    deletePhotographAssets,
    getPhotographManifestSnapshot,
    photographEtagsMatch,
    putPhotographAsset,
    putPhotographManifest,
} from './photographs-r2'

interface PhotographProjectCreateForm {
    sectionId: string
    publication: string
    title: string
    hero: ParsedPhotographImageUpload
}

interface PhotographProjectCreateInput extends PhotographProjectCreateForm {
    projectId: string
    heroImageId: string
    heroObjectKey: string
}

type PhotographProjectCreateFormResult =
    | { ok: true; creation: PhotographProjectCreateForm }
    | { ok: false; error: string; status: 400 | 413 | 415 | 422 }

type PhotographProjectCreateApplyResult =
    | {
          ok: true
          manifest: PhotographManifest
          section: PhotographSectionMetadata
          project: PhotographProjectMetadata
      }
    | { ok: false; error: string; status: 404 | 409 }

type PhotographProjectCreateStoreResult =
    | {
          ok: true
          section: PhotographSectionMetadata
          project: PhotographProjectMetadata
          httpEtag: string
          status: 201
      }
    | { ok: false; error: string; status: 404 | 409 | 412 }

export async function parsePhotographProjectCreateForm(
    formData: FormData,
): Promise<PhotographProjectCreateFormResult> {
    const sectionId = parseRequiredText(formData.get('sectionId'), 120)
    const publication = parseRequiredText(formData.get('publication'), 120)
    const title = parseRequiredText(formData.get('title'), 120)
    const heroFiles = formData.getAll('heroFile')
    const heroAlts = formData.getAll('heroAlt')

    if (!sectionId || !publication || !title) {
        return { ok: false, error: '대주제, 매체명, 프로젝트 제목을 확인해 주세요.', status: 400 }
    }
    if (heroFiles.length !== 1 || heroAlts.length !== 1) {
        return {
            ok: false,
            error: '대표 이미지와 이미지 설명이 각각 하나씩 필요합니다.',
            status: 400,
        }
    }

    const heroResult = await parsePhotographImageUpload(heroFiles[0], heroAlts[0])
    if (!heroResult.ok) return heroResult

    return {
        ok: true,
        creation: { sectionId, publication, title, hero: heroResult.image },
    }
}

export async function storePhotographProjectCreation(
    bucket: R2Bucket,
    env: Env,
    expectedEtag: string,
    creation: PhotographProjectCreateForm,
    createUuid: () => string = () => crypto.randomUUID(),
): Promise<PhotographProjectCreateStoreResult> {
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

    const identifiers = createUniqueProjectIdentifiers(snapshot.manifest, createUuid)
    if (!identifiers) {
        return { ok: false, error: '고유한 프로젝트 식별자를 만들지 못했습니다.', status: 409 }
    }

    const createResult = applyPhotographProjectCreation(snapshot.manifest, {
        ...creation,
        ...identifiers,
    })
    if (!createResult.ok) return createResult

    let assetWriteStarted = false
    let manifestCommitted = false
    try {
        assetWriteStarted = true
        await putPhotographAsset(bucket, env, identifiers.heroObjectKey, creation.hero.imageBytes)
        const storedSnapshot = await putPhotographManifest(
            bucket,
            env,
            createResult.manifest,
            expectedEtag,
        )
        if (!storedSnapshot) {
            return {
                ok: false,
                error: '다른 곳에서 먼저 수정했습니다. 새로 불러온 뒤 다시 시도해 주세요.',
                status: 412,
            }
        }

        manifestCommitted = true
        return {
            ok: true,
            section: createResult.section,
            project: createResult.project,
            httpEtag: storedSnapshot.httpEtag,
            status: 201,
        }
    } finally {
        if (assetWriteStarted && !manifestCommitted) {
            await deletePhotographAssets(bucket, env, [identifiers.heroObjectKey]).catch(
                (cleanupError) => {
                    console.error('Photographs 소주제 대표 이미지 정리 실패:', cleanupError)
                },
            )
        }
    }
}

export function applyPhotographProjectCreation(
    manifest: PhotographManifest,
    creation: PhotographProjectCreateInput,
): PhotographProjectCreateApplyResult {
    const sectionIndex = manifest.sections.findIndex((section) => section.id === creation.sectionId)
    if (sectionIndex < 0) {
        return { ok: false, error: '소주제를 추가할 대주제를 찾을 수 없습니다.', status: 404 }
    }
    if (hasIdentifierCollision(manifest, creation)) {
        return { ok: false, error: '프로젝트 또는 이미지 식별자가 이미 존재합니다.', status: 409 }
    }

    const heroImage: PhotographImageMetadata = {
        id: creation.heroImageId,
        objectKey: creation.heroObjectKey,
        alt: creation.hero.alt,
        width: creation.hero.width,
        height: creation.hero.height,
    }
    const project: PhotographProjectMetadata = {
        id: creation.projectId,
        publication: creation.publication,
        title: creation.title,
        textPosition: 'left',
        heroImageId: heroImage.id,
        galleryImageIds: [],
        images: [heroImage],
    }
    const section = manifest.sections[sectionIndex]
    const updatedSection: PhotographSectionMetadata = {
        ...section,
        projects: [...section.projects, project],
    }
    const updatedManifest: PhotographManifest = {
        ...manifest,
        sections: manifest.sections.map((currentSection, index) =>
            index === sectionIndex ? updatedSection : currentSection,
        ),
    }

    return { ok: true, manifest: updatedManifest, section: updatedSection, project }
}

function createUniqueProjectIdentifiers(
    manifest: PhotographManifest,
    createUuid: () => string,
): Pick<PhotographProjectCreateInput, 'projectId' | 'heroImageId' | 'heroObjectKey'> | null {
    const projectIds = new Set(
        manifest.sections.flatMap((section) => section.projects.map((project) => project.id)),
    )
    const imageIds = new Set(
        manifest.sections.flatMap((section) =>
            section.projects.flatMap((project) => project.images.map((image) => image.id)),
        ),
    )
    const objectKeys = new Set(
        manifest.sections.flatMap((section) =>
            section.projects.flatMap((project) => project.images.map((image) => image.objectKey)),
        ),
    )
    const projectUuid = findUniqueUuid(createUuid, (uuid) => !projectIds.has(`project-${uuid}`))
    const assetUuid = findUniqueUuid(
        createUuid,
        (uuid) =>
            !imageIds.has(`asset-${uuid}`) && !objectKeys.has(`photographs/assets/${uuid}.webp`),
    )
    if (!projectUuid || !assetUuid) return null

    return {
        projectId: `project-${projectUuid}`,
        heroImageId: `asset-${assetUuid}`,
        heroObjectKey: `photographs/assets/${assetUuid}.webp`,
    }
}

function findUniqueUuid(createUuid: () => string, isUnique: (uuid: string) => boolean) {
    for (let attempt = 0; attempt < MAX_UUID_ATTEMPTS; attempt += 1) {
        const uuid = createUuid()
        if (isUnique(uuid)) return uuid
    }
    return null
}

function hasIdentifierCollision(
    manifest: PhotographManifest,
    creation: PhotographProjectCreateInput,
): boolean {
    return manifest.sections.some((section) =>
        section.projects.some(
            (project) =>
                project.id === creation.projectId ||
                project.images.some(
                    (image) =>
                        image.id === creation.heroImageId ||
                        image.objectKey === creation.heroObjectKey,
                ),
        ),
    )
}

function parseRequiredText(value: FormDataEntryValue | null, maxLength: number): string | null {
    if (typeof value !== 'string') return null
    const text = value.trim()
    return text.length > 0 && text.length <= maxLength ? text : null
}

const MAX_UUID_ATTEMPTS = 5
