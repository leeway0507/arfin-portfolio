import type {
    PhotographImageMetadata,
    PhotographManifest,
    PhotographProjectMetadata,
} from '../../lib/apis/photographs/types'
import { getPrefix } from './photos-r2'

const PHOTOGRAPHS_MANIFEST_KEY = 'photographs/manifest.json'
const PHOTOGRAPH_ASSET_CACHE_CONTROL = 'public, max-age=31536000, immutable'

export interface PhotographManifestSnapshot {
    manifest: PhotographManifest
    etag: string
    httpEtag: string
}

export async function getPhotographManifest(
    bucket: R2Bucket,
    env: Env,
): Promise<PhotographManifest | null> {
    const snapshot = await getPhotographManifestSnapshot(bucket, env)
    return snapshot?.manifest ?? null
}

export async function getPhotographManifestSnapshot(
    bucket: R2Bucket,
    env: Env,
): Promise<PhotographManifestSnapshot | null> {
    const prefix = getPrefix(env)
    const objectKey = prefix + PHOTOGRAPHS_MANIFEST_KEY
    const manifestObject = await bucket.get(objectKey)

    if (!manifestObject?.body) return null

    const manifest = normalizePhotographManifest(await manifestObject.json())
    if (!manifest) {
        throw new Error('Photographs manifest 형식이 올바르지 않습니다.')
    }

    return {
        manifest,
        etag: manifestObject.etag,
        httpEtag: manifestObject.httpEtag,
    }
}

export async function putPhotographManifest(
    bucket: R2Bucket,
    env: Env,
    manifest: PhotographManifest,
    expectedEtag: string,
): Promise<PhotographManifestSnapshot | null> {
    if (!isPhotographManifest(manifest)) {
        throw new Error('Photographs manifest 형식이 올바르지 않습니다.')
    }

    const prefix = getPrefix(env)
    const objectKey = prefix + PHOTOGRAPHS_MANIFEST_KEY
    const storedObject = await bucket.put(objectKey, `${JSON.stringify(manifest, null, 2)}\n`, {
        onlyIf: { etagMatches: normalizeEtag(expectedEtag) },
        httpMetadata: {
            contentType: 'application/json',
            cacheControl: 'no-cache',
        },
    })

    if (!storedObject) return null

    return {
        manifest,
        etag: storedObject.etag,
        httpEtag: storedObject.httpEtag,
    }
}

export async function putPhotographAsset(
    bucket: R2Bucket,
    env: Env,
    objectKey: string,
    imageBytes: ArrayBuffer,
): Promise<void> {
    await bucket.put(getPrefix(env) + objectKey, imageBytes, {
        httpMetadata: {
            contentType: 'image/webp',
            cacheControl: PHOTOGRAPH_ASSET_CACHE_CONTROL,
        },
    })
}

export async function deletePhotographAssets(
    bucket: R2Bucket,
    env: Env,
    objectKeys: string[],
): Promise<void> {
    if (objectKeys.length === 0) return
    const prefix = getPrefix(env)
    await bucket.delete(objectKeys.map((objectKey) => prefix + objectKey))
}

export function photographEtagsMatch(left: string, right: string): boolean {
    return normalizeEtag(left) === normalizeEtag(right)
}

export function isPhotographManifest(value: unknown): value is PhotographManifest {
    if (!isRecord(value) || value.version !== 2 || !Array.isArray(value.sections)) {
        return false
    }

    return (
        hasUniqueIds(value.sections) &&
        value.sections.every(
            (section) =>
                isRecord(section) &&
                isNonEmptyString(section.id) &&
                isNonEmptyString(section.title) &&
                Array.isArray(section.projects) &&
                hasUniqueIds(section.projects) &&
                section.projects.every(isPhotographProject),
        )
    )
}

function isPhotographProject(value: unknown): boolean {
    if (
        !isRecord(value) ||
        !isNonEmptyString(value.id) ||
        !isNonEmptyString(value.publication) ||
        !isNonEmptyString(value.title) ||
        (value.textPosition !== 'left' && value.textPosition !== 'right') ||
        !isNonEmptyString(value.heroImageId) ||
        !Array.isArray(value.galleryImageIds) ||
        !value.galleryImageIds.every(isNonEmptyString) ||
        !Array.isArray(value.images)
    ) {
        return false
    }

    const images = value.images
    const galleryImageIds = value.galleryImageIds
    return (
        images.length > 0 &&
        hasUniqueIds(images) &&
        images.some((image) => isRecord(image) && image.id === value.heroImageId) &&
        hasUniqueStrings(galleryImageIds) &&
        galleryImageIds.every((imageId) =>
            images.some((image) => isRecord(image) && image.id === imageId),
        ) &&
        images.every(isPhotographImage)
    )
}

export function normalizePhotographManifest(value: unknown): PhotographManifest | null {
    if (isPhotographManifest(value)) return value
    if (!isLegacyPhotographManifest(value)) return null

    return {
        version: 2,
        sections: value.sections.map((section) => ({
            ...section,
            projects: section.projects.map(migrateLegacyPhotographProject),
        })),
    }
}

function migrateLegacyPhotographProject(
    project: LegacyPhotographProjectMetadata,
): PhotographProjectMetadata {
    return {
        id: project.id,
        publication: project.publication,
        title: project.title,
        textPosition: 'left',
        heroImageId: project.featuredImageId,
        galleryImageIds: project.images
            .filter((image) => image.id !== project.featuredImageId)
            .map((image) => image.id),
        images: project.images,
    }
}

function isLegacyPhotographManifest(value: unknown): value is LegacyPhotographManifest {
    if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.sections)) {
        return false
    }

    return (
        hasUniqueIds(value.sections) &&
        value.sections.every(
            (section) =>
                isRecord(section) &&
                isNonEmptyString(section.id) &&
                isNonEmptyString(section.title) &&
                Array.isArray(section.projects) &&
                hasUniqueIds(section.projects) &&
                section.projects.every(isLegacyPhotographProject),
        )
    )
}

function isLegacyPhotographProject(value: unknown): boolean {
    return (
        isRecord(value) &&
        isNonEmptyString(value.id) &&
        isNonEmptyString(value.publication) &&
        isNonEmptyString(value.title) &&
        isNonEmptyString(value.featuredImageId) &&
        Array.isArray(value.images) &&
        value.images.length > 0 &&
        hasUniqueIds(value.images) &&
        value.images.every(isPhotographImage) &&
        value.images.some((image) => isRecord(image) && image.id === value.featuredImageId)
    )
}

function isPhotographImage(value: unknown): boolean {
    return (
        isRecord(value) &&
        isNonEmptyString(value.id) &&
        isNonEmptyString(value.objectKey) &&
        typeof value.alt === 'string' &&
        typeof value.width === 'number' &&
        Number.isFinite(value.width) &&
        value.width > 0 &&
        typeof value.height === 'number' &&
        Number.isFinite(value.height) &&
        value.height > 0
    )
}

function hasUniqueIds(values: unknown[]): boolean {
    const ids = values.map((value) => (isRecord(value) ? value.id : null))
    return (
        ids.every((id): id is string => typeof id === 'string') && new Set(ids).size === ids.length
    )
}

function hasUniqueStrings(values: string[]): boolean {
    return new Set(values).size === values.length
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

function normalizeEtag(etag: string): string {
    return etag.trim().replace(/^W\//, '').replace(/^"|"$/g, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

interface LegacyPhotographProjectMetadata {
    id: string
    publication: string
    title: string
    featuredImageId: string
    images: PhotographImageMetadata[]
}

interface LegacyPhotographManifest {
    version: 1
    sections: Array<{
        id: string
        title: string
        projects: LegacyPhotographProjectMetadata[]
    }>
}
