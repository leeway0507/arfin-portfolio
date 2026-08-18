import { buildR2ImageUrl } from '../image-url'
import type {
    PhotographAssetCleanupResult,
    PhotographAssetManagementUpdate,
    PhotographAssetUpload,
    PhotographManifest,
    PhotographManifestSnapshot,
    PhotographProjectCreation,
    PhotographProjectDeletion,
    PhotographProjectMetadata,
    PhotographProjectOrderUpdate,
    PhotographProjectUpdate,
    PhotographSection,
    PhotographSectionCreation,
    PhotographSectionDeletion,
    PhotographSectionMetadata,
    PhotographSectionOrderUpdate,
    PhotographSectionRename,
} from './types'

export class PhotographApiError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message)
        this.name = 'PhotographApiError'
    }
}

export async function uploadPhotographAssets(
    getToken: () => Promise<string | null>,
    upload: PhotographAssetUpload,
    etag: string,
): Promise<{ project: PhotographProjectMetadata; etag: string }> {
    const token = await getToken()
    if (!token) {
        throw new PhotographApiError('로그인이 필요합니다.', 401)
    }

    const formData = new FormData()
    formData.set('sectionId', upload.sectionId)
    formData.set('projectId', upload.projectId)
    formData.set('target', upload.target)
    upload.assets.forEach((asset) => {
        formData.append('alts', asset.alt)
        formData.append('files', asset.file)
    })

    const response = await fetch(`${getApiBase()}/api/photograph-assets`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'If-Match': etag,
        },
        body: formData,
    })
    if (!response.ok) {
        throw await createPhotographApiError(response, 'Photographs 이미지 업로드 실패')
    }

    const nextEtag = response.headers.get('ETag')
    if (!nextEtag) {
        throw new PhotographApiError('업로드된 Photographs 설정 버전을 확인할 수 없습니다.', 500)
    }

    const body = (await response.json()) as { project: PhotographProjectMetadata }
    return { project: body.project, etag: nextEtag }
}

export async function managePhotographAssets(
    getToken: () => Promise<string | null>,
    update: PhotographAssetManagementUpdate,
    etag: string,
): Promise<{
    project: PhotographProjectMetadata
    assetCleanup: PhotographAssetCleanupResult
    etag: string
}> {
    const token = await getToken()
    if (!token) {
        throw new PhotographApiError('로그인이 필요합니다.', 401)
    }

    const response = await fetch(`${getApiBase()}/api/photograph-assets`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'If-Match': etag,
        },
        body: JSON.stringify(update),
    })
    if (!response.ok) {
        throw await createPhotographApiError(response, 'Photographs 이미지 관리 실패')
    }

    const nextEtag = response.headers.get('ETag')
    if (!nextEtag) {
        throw new PhotographApiError('저장된 Photographs 설정 버전을 확인할 수 없습니다.', 500)
    }

    const body = (await response.json()) as {
        project: PhotographProjectMetadata
        assetCleanup: PhotographAssetCleanupResult
    }
    return { ...body, etag: nextEtag }
}

export async function createPhotographProject(
    getToken: () => Promise<string | null>,
    creation: PhotographProjectCreation,
    etag: string,
): Promise<{
    section: PhotographSectionMetadata
    project: PhotographProjectMetadata
    etag: string
}> {
    const token = await getToken()
    if (!token) {
        throw new PhotographApiError('로그인이 필요합니다.', 401)
    }

    const formData = new FormData()
    formData.set('sectionId', creation.sectionId)
    formData.set('publication', creation.publication)
    formData.set('title', creation.title)
    formData.set('heroAlt', creation.heroAlt)
    formData.set('heroFile', creation.heroFile)

    const response = await fetch(`${getApiBase()}/api/photograph-projects`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'If-Match': etag,
        },
        body: formData,
    })
    if (!response.ok) {
        throw await createPhotographApiError(response, 'Photographs 소주제 생성 실패')
    }

    const nextEtag = response.headers.get('ETag')
    if (!nextEtag) {
        throw new PhotographApiError('생성된 Photographs 설정 버전을 확인할 수 없습니다.', 500)
    }

    const body = (await response.json()) as {
        section: PhotographSectionMetadata
        project: PhotographProjectMetadata
    }
    return { section: body.section, project: body.project, etag: nextEtag }
}

export async function deletePhotographProject(
    getToken: () => Promise<string | null>,
    deletion: PhotographProjectDeletion,
    etag: string,
): Promise<{
    section: PhotographSectionMetadata
    deletedProjectId: string
    assetCleanup: PhotographAssetCleanupResult
    etag: string
}> {
    const token = await getToken()
    if (!token) {
        throw new PhotographApiError('로그인이 필요합니다.', 401)
    }

    const response = await fetch(`${getApiBase()}/api/photograph-projects`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'If-Match': etag,
        },
        body: JSON.stringify(deletion),
    })
    if (!response.ok) {
        throw await createPhotographApiError(response, 'Photographs 소주제 삭제 실패')
    }

    const nextEtag = response.headers.get('ETag')
    if (!nextEtag) {
        throw new PhotographApiError('삭제된 Photographs 설정 버전을 확인할 수 없습니다.', 500)
    }

    const body = (await response.json()) as {
        section: PhotographSectionMetadata
        deletedProjectId: string
        assetCleanup: PhotographAssetCleanupResult
    }
    return { ...body, etag: nextEtag }
}

export async function createPhotographSection(
    getToken: () => Promise<string | null>,
    creation: PhotographSectionCreation,
    etag: string,
): Promise<{ section: PhotographSectionMetadata; etag: string }> {
    const token = await getToken()
    if (!token) {
        throw new PhotographApiError('로그인이 필요합니다.', 401)
    }

    const response = await fetch(`${getApiBase()}/api/photograph-sections`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'If-Match': etag,
        },
        body: JSON.stringify(creation),
    })
    if (!response.ok) {
        throw await createPhotographApiError(response, 'Photographs 대주제 생성 실패')
    }

    const nextEtag = response.headers.get('ETag')
    if (!nextEtag) {
        throw new PhotographApiError('생성된 Photographs 설정 버전을 확인할 수 없습니다.', 500)
    }

    const body = (await response.json()) as { section: PhotographSectionMetadata }
    return { section: body.section, etag: nextEtag }
}

export async function renamePhotographSection(
    getToken: () => Promise<string | null>,
    rename: PhotographSectionRename,
    etag: string,
): Promise<{ sections: PhotographSectionMetadata[]; etag: string }> {
    return mutatePhotographSections(getToken, 'PATCH', rename, etag)
}

export async function deletePhotographSection(
    getToken: () => Promise<string | null>,
    deletion: PhotographSectionDeletion,
    etag: string,
): Promise<{ sections: PhotographSectionMetadata[]; etag: string }> {
    return mutatePhotographSections(getToken, 'DELETE', deletion, etag)
}

function getApiBase(): string {
    const configuredBase = process.env.NEXT_PUBLIC_API_BASE?.trim()
    if (typeof window !== 'undefined') {
        const base = configuredBase || window.location.origin
        if (base.includes('localhost') && !window.location.hostname.includes('localhost')) {
            return window.location.origin
        }
        return base
    }
    return configuredBase || ''
}

export async function getPhotographSections(): Promise<PhotographSection[]> {
    const response = await fetch(`${getApiBase()}/api/photographs`)
    if (!response.ok) {
        throw new Error(`Photographs 목록 조회 실패 (${response.status})`)
    }

    const manifest = (await response.json()) as PhotographManifest
    return manifest.sections.map(mapPhotographSection)
}

export async function getPhotographManifestSnapshot(): Promise<PhotographManifestSnapshot> {
    const response = await fetch(`${getApiBase()}/api/photographs`, { cache: 'no-store' })
    if (!response.ok) {
        throw await createPhotographApiError(response, 'Photographs 설정 조회 실패')
    }

    const etag = response.headers.get('ETag')
    if (!etag) {
        throw new PhotographApiError('Photographs 설정 버전을 확인할 수 없습니다.', 500)
    }

    return {
        manifest: (await response.json()) as PhotographManifest,
        etag,
    }
}

export async function updatePhotographProject(
    getToken: () => Promise<string | null>,
    update: PhotographProjectUpdate,
    etag: string,
): Promise<{ project: PhotographProjectMetadata; etag: string }> {
    const token = await getToken()
    if (!token) {
        throw new PhotographApiError('로그인이 필요합니다.', 401)
    }

    const response = await fetch(`${getApiBase()}/api/photographs`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'If-Match': etag,
        },
        body: JSON.stringify(update),
    })
    if (!response.ok) {
        throw await createPhotographApiError(response, 'Photographs 프로젝트 저장 실패')
    }

    const nextEtag = response.headers.get('ETag')
    if (!nextEtag) {
        throw new PhotographApiError('저장된 Photographs 설정 버전을 확인할 수 없습니다.', 500)
    }

    const body = (await response.json()) as { project: PhotographProjectMetadata }
    return { project: body.project, etag: nextEtag }
}

export async function updatePhotographProjectOrder(
    getToken: () => Promise<string | null>,
    update: PhotographProjectOrderUpdate,
    etag: string,
): Promise<{ section: PhotographSectionMetadata; etag: string }> {
    const token = await getToken()
    if (!token) {
        throw new PhotographApiError('로그인이 필요합니다.', 401)
    }

    const response = await fetch(`${getApiBase()}/api/photograph-project-order`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'If-Match': etag,
        },
        body: JSON.stringify(update),
    })
    if (!response.ok) {
        throw await createPhotographApiError(response, 'Photographs 소주제 순서 저장 실패')
    }

    const nextEtag = response.headers.get('ETag')
    if (!nextEtag) {
        throw new PhotographApiError('저장된 Photographs 설정 버전을 확인할 수 없습니다.', 500)
    }

    const body = (await response.json()) as { section: PhotographSectionMetadata }
    return { section: body.section, etag: nextEtag }
}

export async function updatePhotographSectionOrder(
    getToken: () => Promise<string | null>,
    update: PhotographSectionOrderUpdate,
    etag: string,
): Promise<{ sections: PhotographSectionMetadata[]; etag: string }> {
    const token = await getToken()
    if (!token) {
        throw new PhotographApiError('로그인이 필요합니다.', 401)
    }

    const response = await fetch(`${getApiBase()}/api/photograph-section-order`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'If-Match': etag,
        },
        body: JSON.stringify(update),
    })
    if (!response.ok) {
        throw await createPhotographApiError(response, 'Photographs 대주제 순서 저장 실패')
    }

    const nextEtag = response.headers.get('ETag')
    if (!nextEtag) {
        throw new PhotographApiError('저장된 Photographs 설정 버전을 확인할 수 없습니다.', 500)
    }

    const body = (await response.json()) as { sections: PhotographSectionMetadata[] }
    return { sections: body.sections, etag: nextEtag }
}

async function mutatePhotographSections(
    getToken: () => Promise<string | null>,
    method: 'PATCH' | 'DELETE',
    body: PhotographSectionRename | PhotographSectionDeletion,
    etag: string,
): Promise<{ sections: PhotographSectionMetadata[]; etag: string }> {
    const token = await getToken()
    if (!token) {
        throw new PhotographApiError('로그인이 필요합니다.', 401)
    }

    const response = await fetch(`${getApiBase()}/api/photograph-sections`, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'If-Match': etag,
        },
        body: JSON.stringify(body),
    })
    if (!response.ok) {
        const fallback =
            method === 'PATCH'
                ? 'Photographs 대주제 이름 수정 실패'
                : 'Photographs 대주제 삭제 실패'
        throw await createPhotographApiError(response, fallback)
    }

    const nextEtag = response.headers.get('ETag')
    if (!nextEtag) {
        throw new PhotographApiError('저장된 Photographs 설정 버전을 확인할 수 없습니다.', 500)
    }

    const responseBody = (await response.json()) as { sections: PhotographSectionMetadata[] }
    return { sections: responseBody.sections, etag: nextEtag }
}

function mapPhotographSection(section: PhotographSectionMetadata): PhotographSection {
    return {
        ...section,
        projects: section.projects.map((project) => ({
            ...project,
            images: project.images.map((image) => ({
                ...image,
                imageUrl: buildR2ImageUrl(image.objectKey),
            })),
        })),
    }
}

async function createPhotographApiError(
    response: Response,
    fallbackMessage: string,
): Promise<PhotographApiError> {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    return new PhotographApiError(
        body.error ?? `${fallbackMessage} (${response.status})`,
        response.status,
    )
}
