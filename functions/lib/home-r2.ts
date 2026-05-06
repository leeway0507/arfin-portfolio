import { getPrefix } from './photos-r2'

const HOME_IMAGE_KEY = 'home/main.webp'
const HOME_CONFIG_KEY = 'home/main.json'
const DEFAULT_HOME_ALT = 'Arfin Yoon main image'

const DEFAULT_HOME_LAYOUT: HomeImageLayout = {
    preset: 'default',
    desktopWidthPercent: 55,
    mobileWidthPercent: 95,
    maxWidth: 640,
}

type HomeImageSizePreset = 'compact' | 'default' | 'wide' | 'full' | 'custom'

export interface HomeImageLayout {
    preset: HomeImageSizePreset
    desktopWidthPercent: number
    mobileWidthPercent: number
    maxWidth: number
}

export interface HomeImageConfig {
    imageKey: string | null
    alt: string
    updatedAt: string
    layout: HomeImageLayout
}

function getObjectKey(env: Env, key: string): string {
    const prefix = getPrefix(env)
    return prefix ? prefix + key : key
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
    return Math.min(max, Math.max(min, Math.round(value)))
}

function normalizeLayout(layout: unknown): HomeImageLayout {
    if (!layout || typeof layout !== 'object') return DEFAULT_HOME_LAYOUT
    const data = layout as Partial<HomeImageLayout>
    const preset = data.preset ?? 'default'

    if (preset === 'compact') {
        return { preset, desktopWidthPercent: 45, mobileWidthPercent: 90, maxWidth: 520 }
    }
    if (preset === 'default') {
        return DEFAULT_HOME_LAYOUT
    }
    if (preset === 'wide') {
        return { preset, desktopWidthPercent: 68, mobileWidthPercent: 95, maxWidth: 840 }
    }
    if (preset === 'full') {
        return { preset, desktopWidthPercent: 82, mobileWidthPercent: 95, maxWidth: 1040 }
    }

    return {
        preset: 'custom',
        desktopWidthPercent: clamp(data.desktopWidthPercent, 30, 95, 55),
        mobileWidthPercent: clamp(data.mobileWidthPercent, 70, 100, 95),
        maxWidth: clamp(data.maxWidth, 420, 1920, 640),
    }
}

function parseConfig(json: unknown): HomeImageConfig | null {
    if (!json || typeof json !== 'object') return null
    const data = json as Partial<HomeImageConfig>
    if (data.imageKey !== null && (typeof data.imageKey !== 'string' || !data.imageKey.trim())) {
        return null
    }
    return {
        imageKey: data.imageKey ?? null,
        alt: typeof data.alt === 'string' && data.alt.trim() ? data.alt.trim() : DEFAULT_HOME_ALT,
        updatedAt:
            typeof data.updatedAt === 'string' && data.updatedAt.trim() ? data.updatedAt : '',
        layout: normalizeLayout(data.layout),
    }
}

export async function getHomeImageConfig(
    bucket: R2Bucket,
    env: Env,
): Promise<HomeImageConfig | null> {
    const obj = await bucket.get(getObjectKey(env, HOME_CONFIG_KEY))
    if (!obj?.body) return null
    try {
        return parseConfig((await obj.json()) as unknown)
    } catch {
        return null
    }
}

export async function putHomeImage(
    bucket: R2Bucket,
    env: Env,
    file: File,
    alt: string,
    layout?: unknown,
): Promise<HomeImageConfig> {
    const previous = await getHomeImageConfig(bucket, env)
    const imageBody = await file.arrayBuffer()
    await bucket.put(getObjectKey(env, HOME_IMAGE_KEY), imageBody, {
        httpMetadata: { contentType: file.type || 'image/webp' },
    })

    const config: HomeImageConfig = {
        imageKey: HOME_IMAGE_KEY,
        alt: alt.trim() || DEFAULT_HOME_ALT,
        updatedAt: new Date().toISOString(),
        layout: normalizeLayout(layout ?? previous?.layout),
    }

    await putHomeImageConfig(bucket, env, config)
    return config
}

async function putHomeImageConfig(
    bucket: R2Bucket,
    env: Env,
    config: HomeImageConfig,
): Promise<void> {
    await bucket.put(getObjectKey(env, HOME_CONFIG_KEY), JSON.stringify(config), {
        httpMetadata: { contentType: 'application/json' },
    })
}

export async function updateHomeImageLayout(
    bucket: R2Bucket,
    env: Env,
    layout: unknown,
): Promise<HomeImageConfig> {
    const previous = await getHomeImageConfig(bucket, env)
    const config: HomeImageConfig = {
        imageKey: previous?.imageKey ?? null,
        alt: previous?.alt ?? DEFAULT_HOME_ALT,
        updatedAt: previous?.updatedAt ?? '',
        layout: normalizeLayout(layout),
    }

    await putHomeImageConfig(bucket, env, config)
    return config
}
