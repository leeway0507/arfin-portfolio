import type { HomeImage, HomeImageApiResponse } from './types'
import type { HomeImageLayout } from './types'
import { normalizeHomeImageLayout } from './layout'

const DEFAULT_HOME_ALT = 'Arfin Yoon main image'
const DEFAULT_IMAGE_BASE_URL = 'https://images.arfinyoon.com'

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

function buildImageUrl(imageKey: string, updatedAt: string | null): string {
    const baseUrl = (process.env.NEXT_PUBLIC_IMAGE_URL?.trim() || DEFAULT_IMAGE_BASE_URL).replace(
        /\/$/,
        '',
    )
    const path = imageKey
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/')
    const version = updatedAt ? `?v=${encodeURIComponent(updatedAt)}` : ''
    return `${baseUrl}/${path}${version}`
}

function toHomeImage(data: HomeImageApiResponse): HomeImage {
    const imageKey = data.imageKey ?? null
    const updatedAt = data.updatedAt ?? null
    return {
        imageKey,
        imageUrl: imageKey ? buildImageUrl(imageKey, updatedAt) : null,
        alt: data.alt?.trim() || DEFAULT_HOME_ALT,
        updatedAt,
        layout: normalizeHomeImageLayout(data.layout),
    }
}

export async function getPublicHomeImage(): Promise<HomeImage> {
    const base = getApiBase()
    const res = await fetch(`${base}/api/home`)
    if (!res.ok) {
        throw new Error(`홈 대표 이미지 조회 실패 (${res.status})`)
    }
    return toHomeImage((await res.json()) as HomeImageApiResponse)
}

export async function uploadHomeImage(
    getToken: () => Promise<string | null>,
    file: File,
    alt = DEFAULT_HOME_ALT,
    layout?: HomeImageLayout,
): Promise<HomeImage> {
    const token = await getToken()
    if (!token) {
        throw new Error('로그인이 필요합니다.')
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('alt', alt)
    if (layout) {
        formData.append('layout', JSON.stringify(layout))
    }

    const base = getApiBase()
    const res = await fetch(`${base}/api/home`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    })
    const body = (await res.json().catch(() => ({}))) as HomeImageApiResponse & {
        error?: string
    }

    if (!res.ok) {
        throw new Error(body.error ?? `홈 대표 이미지 저장 실패 (${res.status})`)
    }

    return toHomeImage(body)
}

export async function updateHomeImageLayout(
    getToken: () => Promise<string | null>,
    layout: HomeImageLayout,
): Promise<HomeImage> {
    const token = await getToken()
    if (!token) {
        throw new Error('로그인이 필요합니다.')
    }

    const base = getApiBase()
    const res = await fetch(`${base}/api/home`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ layout }),
    })
    const body = (await res.json().catch(() => ({}))) as HomeImageApiResponse & {
        error?: string
    }

    if (!res.ok) {
        throw new Error(body.error ?? `홈 대표 이미지 크기 저장 실패 (${res.status})`)
    }

    return toHomeImage(body)
}
