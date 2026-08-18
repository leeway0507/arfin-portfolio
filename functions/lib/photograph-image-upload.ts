import { readWebpDimensions } from './webp'

export const MAX_PHOTOGRAPH_IMAGE_BYTES = 2 * 1024 * 1024
export const MAX_PHOTOGRAPH_IMAGE_EDGE = 1920
export const MAX_PHOTOGRAPH_IMAGE_ALT_LENGTH = 240

export interface ParsedPhotographImageUpload {
    alt: string
    imageBytes: ArrayBuffer
    width: number
    height: number
}

export type PhotographImageUploadParseResult =
    | { ok: true; image: ParsedPhotographImageUpload }
    | { ok: false; error: string; status: 400 | 413 | 415 | 422 }

export async function parsePhotographImageUpload(
    fileValue: FormDataEntryValue | null,
    altValue: FormDataEntryValue | null,
): Promise<PhotographImageUploadParseResult> {
    const alt = parseRequiredText(altValue, MAX_PHOTOGRAPH_IMAGE_ALT_LENGTH)
    if (!alt) {
        return { ok: false, error: '이미지 설명을 입력해 주세요.', status: 400 }
    }
    if (!(fileValue instanceof File)) {
        return { ok: false, error: '업로드할 이미지 파일이 필요합니다.', status: 400 }
    }
    if (fileValue.type !== 'image/webp') {
        return { ok: false, error: 'WebP 이미지만 업로드할 수 있습니다.', status: 415 }
    }
    if (fileValue.size === 0 || fileValue.size > MAX_PHOTOGRAPH_IMAGE_BYTES) {
        return { ok: false, error: '이미지는 2MB 이하이어야 합니다.', status: 413 }
    }

    const imageBytes = await fileValue.arrayBuffer()
    const dimensions = readWebpDimensions(imageBytes)
    if (
        !dimensions ||
        dimensions.width > MAX_PHOTOGRAPH_IMAGE_EDGE ||
        dimensions.height > MAX_PHOTOGRAPH_IMAGE_EDGE
    ) {
        return {
            ok: false,
            error: '올바른 WebP 이미지인지, 긴 변이 1920px 이하인지 확인해 주세요.',
            status: 422,
        }
    }

    return {
        ok: true,
        image: {
            alt,
            imageBytes,
            width: dimensions.width,
            height: dimensions.height,
        },
    }
}

function parseRequiredText(value: FormDataEntryValue | null, maxLength: number): string | null {
    if (typeof value !== 'string') return null
    const text = value.trim()
    return text.length > 0 && text.length <= maxLength ? text : null
}
