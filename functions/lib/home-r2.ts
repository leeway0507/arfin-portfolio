/**
 * 홈 대표 이미지와 표시 설정을 R2에 읽고 쓰는 저장소 모듈.
 *
 * prefix를 제외한 논리 key는 다음 두 개로 고정한다.
 * - `home/main.webp`: 업로드할 때마다 덮어쓰는 대표 이미지 본문
 * - `home/main.json`: alt, 이미지 갱신 시각, 레이아웃을 담은 설정
 *
 * 외부 API handler는 R2 key 조합과 설정 정규화 규칙을 직접 알 필요 없이 이
 * 모듈의 공개 함수만 사용한다.
 */
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
    /** 미리 정한 크기 또는 사용자가 직접 지정한 custom 크기 */
    preset: HomeImageSizePreset
    /** 데스크톱 viewport에서 이미지 컨테이너가 차지할 너비(%) */
    desktopWidthPercent: number
    /** 모바일 viewport에서 이미지 컨테이너가 차지할 너비(%) */
    mobileWidthPercent: number
    /** 이미지 컨테이너가 커질 수 있는 최대 너비(px) */
    maxWidth: number
}

export interface HomeImageConfig {
    /** prefix를 제외한 이미지의 논리 R2 key. 이미지가 없으면 null */
    imageKey: string | null
    /** 홈 이미지의 접근성 대체 텍스트 */
    alt: string
    /** 이미지 파일을 마지막으로 교체한 ISO 시각. 레이아웃 변경 시에는 유지 */
    updatedAt: string
    /** 범위 검사와 preset 적용이 끝난 표시 크기 */
    layout: HomeImageLayout
}

/** 공통 portfolio prefix와 모듈 내부의 논리 key를 실제 R2 key로 합친다. */
function getObjectKey(env: Env, key: string): string {
    const prefix = getPrefix(env)
    return prefix ? prefix + key : key
}

/** custom 숫자값을 반올림하고 허용 범위 안으로 제한한다. */
function clamp(value: unknown, min: number, max: number, fallback: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
    return Math.min(max, Math.max(min, Math.round(value)))
}

/**
 * 외부 입력을 항상 완전한 HomeImageLayout으로 바꾼다.
 * 알려진 preset은 서버의 고정값을 사용하고, 그 외 값은 custom으로 간주해 각
 * 숫자를 허용 범위로 제한한다. 입력이 객체가 아니면 default preset을 사용한다.
 */
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

/**
 * R2 JSON을 런타임에서 검증하고 누락 가능한 필드에는 기본값을 채운다.
 * imageKey가 null 또는 비어 있지 않은 문자열이 아니면 손상된 설정으로 판단한다.
 */
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

/**
 * R2 설정을 읽어 정규화한다.
 * 객체가 없거나 JSON 파싱/최소 검증에 실패하면 예외 대신 null을 반환한다.
 */
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

/**
 * 대표 이미지를 고정 key에 덮어쓰고 새 설정을 저장한다.
 * layout을 생략하면 이전 레이아웃을 유지하며, 이전 설정도 없으면 default를 쓴다.
 * 반환값은 R2에 저장한 것과 같은 정규화된 설정이다.
 */
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

/** 정규화가 끝난 홈 설정을 JSON 문서로 저장한다. */
async function putHomeImageConfig(
    bucket: R2Bucket,
    env: Env,
    config: HomeImageConfig,
): Promise<void> {
    await bucket.put(getObjectKey(env, HOME_CONFIG_KEY), JSON.stringify(config), {
        httpMetadata: { contentType: 'application/json' },
    })
}

/**
 * 현재 이미지 key, alt, 이미지 갱신 시각을 보존하면서 레이아웃만 교체한다.
 * 아직 대표 이미지가 없어도 imageKey가 null인 설정 파일을 생성할 수 있다.
 */
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
