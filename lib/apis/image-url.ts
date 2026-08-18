const DEFAULT_IMAGE_URL_PREFIX = 'https://images.arfinyoon.com/'

/**
 * R2 object key를 브라우저가 요청할 수 있는 이미지 URL로 바꾼다.
 *
 * 운영 R2는 `images.arfinyoon.com` 커스텀 도메인으로 공개되어 객체 key를 URL
 * 경로에 바로 붙일 수 있다. 반면 Wrangler의 로컬 R2는 외부 공개 URL이 없고
 * Pages Function의 R2 binding으로만 접근할 수 있으므로 이미지 프록시를 거친다.
 * 환경 변수에는 이 차이를 포함한 "완성된 URL 접두사"를 지정한다.
 *
 * - local: `NEXT_PUBLIC_IMAGE_URL=http://localhost:8788/api/photos/image?filename=`
 * - prod:  `NEXT_PUBLIC_IMAGE_URL=https://images.arfinyoon.com/`
 *
 * 접두사가 이미 `=` 또는 `/`를 포함하므로 여기서는 구분자를 추가하지 않는다.
 */
export function buildR2ImageUrl(objectKey: string, version?: string | null): string {
    const prefix = getImageUrlPrefix()
    const encodedKey = objectKey
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/')
    const separator = prefix.endsWith('=') || prefix.endsWith('/') ? '' : '/'
    const imageUrl = `${prefix}${separator}${encodedKey}`

    if (!version) return imageUrl

    const versionSeparator = imageUrl.includes('?') ? '&' : '?'
    return `${imageUrl}${versionSeparator}v=${encodeURIComponent(version)}`
}

function getImageUrlPrefix(): string {
    const configuredPrefix = process.env.NEXT_PUBLIC_IMAGE_URL?.trim()
    if (
        typeof window !== 'undefined' &&
        configuredPrefix?.includes('localhost') &&
        !window.location.hostname.includes('localhost')
    ) {
        return DEFAULT_IMAGE_URL_PREFIX
    }
    return configuredPrefix || DEFAULT_IMAGE_URL_PREFIX
}
