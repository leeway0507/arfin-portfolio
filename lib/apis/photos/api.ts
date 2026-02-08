import type { PhotoListItem } from './types'

const IMAGE_EXT = /\.(webp|jpg|jpeg|png|gif)$/i

/** 경로만 제거하여 원본 파일명 반환 (서버와 동일 로직) */
function getOriginalFilename(name: string): string {
    return name.replace(/^.*[/\\]/, '').trim() || 'image'
}

/** 공백·특수문자 정규화. CDN/URL 호환을 위해 공백 → 하이픈 (서버와 동일) */
function sanitizeFilename(name: string): string {
    const base = name
        .replace(/\s+/g, '-')
        .replace(/[^\w.-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    return base || 'image'
}

/** 기존 목록에 없는 고유 파일명 반환 (서버와 동일 로직) */
function uniqueFilename(base: string, existing: Set<string>): string {
    if (!existing.has(base)) return base
    const extMatch = base.match(IMAGE_EXT)
    const ext = extMatch ? extMatch[0] : '.webp'
    const stem = base.slice(0, -ext.length)
    let n = 1
    while (existing.has(`${stem} (${n})${ext}`)) n++
    return `${stem} (${n})${ext}`
}

/**
 * 업로드 전 클라이언트에서 예측한 파일명 목록 (서버 uniqueFilename 규칙과 동일).
 * 낙관적 업데이트 시 order.json에 추가할 항목 예측용.
 */
export function predictFilenames(files: File[], existingFilenames: string[]): string[] {
    const existingSet = new Set(existingFilenames)
    const result: string[] = []
    for (const file of files) {
        const raw = getOriginalFilename(file.name)
        const base = sanitizeFilename(raw)
        const filename = uniqueFilename(base, existingSet)
        existingSet.add(filename)
        result.push(filename)
    }
    return result
}

function getApiBase(): string {
    if (typeof window !== 'undefined') {
        const base = process.env.NEXT_PUBLIC_API_BASE ?? window.location.origin
        // Production: if env points to localhost but we're not on localhost, use current origin
        if (base.includes('localhost') && !window.location.hostname.includes('localhost')) {
            return window.location.origin
        }
        return base
    }
    return process.env.NEXT_PUBLIC_API_BASE ?? ''
}

/** Admin용 이미지 URL. NEXT_PUBLIC_IMAGE_URL(CDN)에서 직접 로드 */
function buildImageUrl(filename: string): string {
    const baseUrl = (
        (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_IMAGE_URL) ||
        ''
    ).replace(/\/$/, '')
    return `${baseUrl}/${encodeURIComponent(filename)}`
}

/** API 응답 (imageUrl은 프론트에서 NEXT_PUBLIC_IMAGE_URL 기반으로 구성) */
interface PhotoListApiResponse {
    items: Array<{ filename: string; caption: string; order: number }>
}

/**
 * R2 포트폴리오 사진 목록 조회 (GET /api/photos). 인증 필요.
 */
export async function getPhotoList(
    getToken: () => Promise<string | null>,
): Promise<PhotoListItem[]> {
    const token = await getToken()
    if (!token) {
        throw new Error('로그인이 필요합니다.')
    }

    const base = getApiBase()
    const url = `${base}/api/photos`
    const res = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })

    if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `목록 조회 실패 (${res.status})`)
    }

    const data = (await res.json()) as PhotoListApiResponse
    const rawItems = data.items ?? []
    return rawItems.map((item) => ({
        ...item,
        imageUrl: buildImageUrl(item.filename),
    }))
}

/**
 * R2 order.json 기반 공개 사진 목록 조회 (GET /api/photo-list). 인증 없음. 메인 포트폴리오·캐러셀용.
 * Admin GET /api/photos와 동일한 items 형태(order.json 단일 소스).
 */
export async function getPublicPhotoList(): Promise<PhotoListItem[]> {
    const base = getApiBase()
    const res = await fetch(`${base}/api/photo-list`)
    if (!res.ok) {
        throw new Error(`목록 조회 실패 (${res.status})`)
    }
    const data = (await res.json()) as PhotoListApiResponse
    const rawItems = data.items ?? []
    return rawItems.map((item) => ({
        ...item,
        imageUrl: buildImageUrl(item.filename),
    }))
}

interface UploadResponse {
    ok?: boolean
    error?: string
    uploaded?: string[]
    order?: string[]
}

/**
 * 사진 업로드 (POST /api/photos, multipart/form-data). 인증 필요.
 */
export async function uploadPhotos(
    getToken: () => Promise<string | null>,
    files: File[],
    onProgress?: (completed: number, total: number) => void,
): Promise<{
    results: Array<{ success: boolean; error?: string }>
    succeeded: number
    uploaded: string[]
    order?: string[]
}> {
    const token = await getToken()
    if (!token) {
        return {
            results: files.map(() => ({ success: false, error: '로그인이 필요합니다.' })),
            succeeded: 0,
            uploaded: [],
        }
    }

    const base = getApiBase()
    const results: Array<{ success: boolean; error?: string }> = []
    let succeeded = 0
    const uploaded: string[] = []
    let lastOrder: string[] | undefined

    for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append('files', files[i])

        const res = await fetch(`${base}/api/photos`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        })

        const body = (await res.json().catch(() => ({}))) as UploadResponse
        const success = res.ok && body.ok === true

        if (success) {
            succeeded++
            results.push({ success: true })
            if (Array.isArray(body.uploaded)) {
                uploaded.push(...body.uploaded)
            }
            if (Array.isArray(body.order)) {
                lastOrder = body.order
            }
        } else {
            results.push({
                success: false,
                error: body.error ?? `업로드 실패 (${res.status})`,
            })
        }
        onProgress?.(i + 1, files.length)
    }

    return { results, succeeded, uploaded, order: lastOrder }
}

/** 파일명에서 기본 캡션 생성 (확장자·(N) 제거). 캡션 비었을 때 표시용 */
export function captionFromFilename(filename: string): string {
    return filename
        .replace(/\.(webp|jpg|jpeg|png|gif)$/i, '')
        .replace(/\s*\([^)]*\)\s*$/, '')
        .trim()
}

/** order.json (filenames[]) → PhotoListItem[] 변환 */
export function orderToPhotoList(order: string[]): PhotoListItem[] {
    return orderToPhotoListWithPreviews(order)
}

/**
 * filenames + 선택적 미리보기 URL(같은 순서)로 PhotoListItem[] 생성.
 * 낙관적 업데이트 시 아직 CDN에 없는 항목에 로컬 Object URL을 넣을 때 사용.
 */
export function orderToPhotoListWithPreviews(
    filenames: string[],
    previewUrls?: string[],
): PhotoListItem[] {
    return filenames.map((filename, index) => {
        const imageUrl = previewUrls?.[index] ?? buildImageUrl(filename)
        return {
            filename,
            caption: captionFromFilename(filename) || filename,
            order: index,
            imageUrl,
        }
    })
}

/** filename → PhotoListItem (업로드 직후 optimistic 업데이트용) */
export function photoListItemFromFilename(filename: string, order: number): PhotoListItem {
    return {
        filename,
        caption: captionFromFilename(filename) || filename,
        order,
        imageUrl: buildImageUrl(filename),
    }
}

/**
 * 사진 삭제 (DELETE /api/photos?filename=xxx). 인증 필요.
 * 성공 시 응답의 order로 로컬 데이터 갱신 가능.
 */
export async function deletePhoto(
    getToken: () => Promise<string | null>,
    filename: string,
): Promise<{ success: boolean; error?: string; order?: string[] }> {
    const token = await getToken()
    if (!token) {
        return { success: false, error: '로그인이 필요합니다.' }
    }

    const base = getApiBase()
    const url = `${base}/api/photos?filename=${encodeURIComponent(filename)}`
    const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    })

    const body = (await res.json().catch(() => ({}))) as { error?: string; order?: string[] }
    if (!res.ok) {
        return { success: false, error: body.error ?? `삭제 실패 (${res.status})` }
    }
    return { success: true, order: body.order }
}

/**
 * 캡션 수정 (PATCH /api/photos body: { filename, caption }). 인증 필요.
 */
export async function updateCaption(
    getToken: () => Promise<string | null>,
    filename: string,
    caption: string,
): Promise<{ success: boolean; error?: string }> {
    const token = await getToken()
    if (!token) {
        return { success: false, error: '로그인이 필요합니다.' }
    }

    const base = getApiBase()
    const res = await fetch(`${base}/api/photos`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename, caption }),
    })

    const body = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
        return { success: false, error: body.error ?? `캡션 저장 실패 (${res.status})` }
    }
    return { success: true }
}

/**
 * 사진 순서 변경 (PATCH /api/photos). 인증 필요.
 * 성공 시 응답의 order로 로컬 데이터 갱신 가능.
 */
export async function reorderPhotos(
    getToken: () => Promise<string | null>,
    filenames: string[],
): Promise<{ success: boolean; error?: string; order?: string[] }> {
    const token = await getToken()
    if (!token) {
        return { success: false, error: '로그인이 필요합니다.' }
    }

    const base = getApiBase()
    const res = await fetch(`${base}/api/photos`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filenames }),
    })

    const body = (await res.json().catch(() => ({}))) as { error?: string; order?: string[] }
    if (!res.ok) {
        return { success: false, error: body.error ?? `순서 저장 실패 (${res.status})` }
    }
    return { success: true, order: body.order }
}
