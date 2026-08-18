import type {
    PhotographAssetTarget,
    PhotographImageMetadata,
    PhotographManifest,
    PhotographProjectMetadata,
} from '../../lib/apis/photographs/types'
import {
    deletePhotographAssets,
    getPhotographManifestSnapshot,
    photographEtagsMatch,
    putPhotographAsset,
    putPhotographManifest,
} from './photographs-r2'
import {
    MAX_PHOTOGRAPH_IMAGE_BYTES,
    parsePhotographImageUpload,
    type ParsedPhotographImageUpload,
} from './photograph-image-upload'

const MAX_PHOTOGRAPH_BATCH_BYTES = 20 * 1024 * 1024
const MAX_PHOTOGRAPH_GALLERY_ASSETS = 10

type PhotographAssetUploadItem = ParsedPhotographImageUpload

interface PhotographAssetUploadForm {
    sectionId: string
    projectId: string
    target: PhotographAssetTarget
    assets: PhotographAssetUploadItem[]
}

interface PhotographAssetUploadInput extends PhotographAssetUploadItem {
    imageId: string
    objectKey: string
}

interface PhotographAssetBatchInput {
    sectionId: string
    projectId: string
    target: PhotographAssetTarget
    assets: PhotographAssetUploadInput[]
}

type PhotographAssetUploadResult =
    | {
          ok: true
          project: PhotographProjectMetadata
          httpEtag: string
          status: 201
      }
    | {
          ok: false
          error: string
          status: 400 | 404 | 412
      }

type PhotographAssetFormResult =
    | { ok: true; upload: PhotographAssetUploadForm }
    | { ok: false; error: string; status: 400 | 413 | 415 | 422 }

type PhotographAssetApplyResult =
    | { ok: true; manifest: PhotographManifest; project: PhotographProjectMetadata }
    | { ok: false; error: string; status: 400 | 404 }

export async function parsePhotographAssetUploadForm(
    formData: FormData,
): Promise<PhotographAssetFormResult> {
    const sectionId = parseRequiredText(formData.get('sectionId'), 120)
    const projectId = parseRequiredText(formData.get('projectId'), 120)
    const target = formData.get('target')
    const files = formData.getAll('files')
    const rawAlts = formData.getAll('alts')

    if (!sectionId || !projectId || (target !== 'hero' && target !== 'gallery')) {
        return { ok: false, error: '이미지 업로드 영역을 확인해 주세요.', status: 400 }
    }
    if (!hasValidAssetCount(target, files.length) || files.length !== rawAlts.length) {
        return {
            ok: false,
            error:
                target === 'hero'
                    ? '상단 영역에는 이미지 한 장만 넣을 수 있습니다.'
                    : '하단 영역에는 한 번에 1장부터 10장까지 넣을 수 있습니다.',
            status: 400,
        }
    }

    if (files.some((file) => !(file instanceof File))) {
        return { ok: false, error: '업로드할 이미지 파일을 확인해 주세요.', status: 400 }
    }

    const imageFiles = files as File[]
    if (
        imageFiles.some((file) => file.size > MAX_PHOTOGRAPH_IMAGE_BYTES) ||
        imageFiles.reduce((total, file) => total + file.size, 0) > MAX_PHOTOGRAPH_BATCH_BYTES
    ) {
        return {
            ok: false,
            error: '이미지는 장당 2MB, 전체 20MB 이하이어야 합니다.',
            status: 413,
        }
    }

    const assets: PhotographAssetUploadItem[] = []
    for (let index = 0; index < imageFiles.length; index += 1) {
        const imageResult = await parsePhotographImageUpload(imageFiles[index], rawAlts[index])
        if (!imageResult.ok) {
            return {
                ok: false,
                error: `${index + 1}번째 이미지: ${imageResult.error}`,
                status: imageResult.status,
            }
        }
        assets.push(imageResult.image)
    }

    return { ok: true, upload: { sectionId, projectId, target, assets } }
}

export async function storePhotographAssets(
    bucket: R2Bucket,
    env: Env,
    expectedEtag: string,
    upload: PhotographAssetUploadForm,
    assetUuids = upload.assets.map(() => crypto.randomUUID()),
): Promise<PhotographAssetUploadResult> {
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
    if (assetUuids.length !== upload.assets.length) {
        return { ok: false, error: '이미지 식별자 수가 올바르지 않습니다.', status: 400 }
    }

    const preparedAssets = upload.assets.map((asset, index) => ({
        ...asset,
        imageId: `asset-${assetUuids[index]}`,
        objectKey: `photographs/assets/${assetUuids[index]}.webp`,
    }))
    const updateResult = applyPhotographAssetUpload(snapshot.manifest, {
        sectionId: upload.sectionId,
        projectId: upload.projectId,
        target: upload.target,
        assets: preparedAssets,
    })
    if (!updateResult.ok) return updateResult

    const attemptedObjectKeys: string[] = []
    let manifestCommitted = false
    try {
        for (const asset of preparedAssets) {
            attemptedObjectKeys.push(asset.objectKey)
            await putPhotographAsset(bucket, env, asset.objectKey, asset.imageBytes)
        }

        const storedSnapshot = await putPhotographManifest(
            bucket,
            env,
            updateResult.manifest,
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
            project: updateResult.project,
            httpEtag: storedSnapshot.httpEtag,
            status: 201,
        }
    } finally {
        if (!manifestCommitted && attemptedObjectKeys.length > 0) {
            await deletePhotographAssets(bucket, env, attemptedObjectKeys).catch((cleanupError) => {
                console.error('Photographs 업로드 객체 정리 실패:', cleanupError)
            })
        }
    }
}

export function applyPhotographAssetUpload(
    manifest: PhotographManifest,
    upload: PhotographAssetBatchInput,
): PhotographAssetApplyResult {
    if (!hasValidAssetCount(upload.target, upload.assets.length)) {
        return { ok: false, error: '영역에 넣을 이미지 수가 올바르지 않습니다.', status: 400 }
    }

    const sectionIndex = manifest.sections.findIndex((section) => section.id === upload.sectionId)
    if (sectionIndex < 0) {
        return { ok: false, error: '이미지를 추가할 대주제를 찾을 수 없습니다.', status: 404 }
    }

    const section = manifest.sections[sectionIndex]
    const projectIndex = section.projects.findIndex((project) => project.id === upload.projectId)
    if (projectIndex < 0) {
        return { ok: false, error: '이미지를 추가할 프로젝트를 찾을 수 없습니다.', status: 404 }
    }

    const project = section.projects[projectIndex]
    const images: PhotographImageMetadata[] = upload.assets.map((asset) => ({
        id: asset.imageId,
        objectKey: asset.objectKey,
        alt: asset.alt,
        width: asset.width,
        height: asset.height,
    }))
    const updatedProject: PhotographProjectMetadata = {
        ...project,
        images: [...project.images, ...images],
        heroImageId: upload.target === 'hero' ? images[0].id : project.heroImageId,
        galleryImageIds:
            upload.target === 'gallery'
                ? [...project.galleryImageIds, ...images.map((image) => image.id)]
                : project.galleryImageIds,
    }
    const updatedSection = {
        ...section,
        projects: section.projects.map((currentProject, index) =>
            index === projectIndex ? updatedProject : currentProject,
        ),
    }
    const updatedManifest = {
        ...manifest,
        sections: manifest.sections.map((currentSection, index) =>
            index === sectionIndex ? updatedSection : currentSection,
        ),
    }

    return { ok: true, manifest: updatedManifest, project: updatedProject }
}

function hasValidAssetCount(target: PhotographAssetTarget, count: number): boolean {
    return target === 'hero' ? count === 1 : count >= 1 && count <= MAX_PHOTOGRAPH_GALLERY_ASSETS
}

function parseRequiredText(value: FormDataEntryValue | null, maxLength: number): string | null {
    if (typeof value !== 'string') return null
    const text = value.trim()
    return text.length > 0 && text.length <= maxLength ? text : null
}
