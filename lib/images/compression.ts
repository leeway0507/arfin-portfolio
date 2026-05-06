import imageCompression from 'browser-image-compression'

export const IMAGE_COMPRESSION_OPTIONS = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp' as const,
}

export const ACCEPTED_IMAGE_MIME_TYPES = 'image/jpeg,image/png,image/webp,image/gif'
export const ACCEPTED_IMAGE_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.gif'

export function filterImageFiles(files: FileList | null): File[] {
    if (!files || files.length === 0) return []
    return Array.from(files).filter((file) => file.type.startsWith('image/'))
}

function getWebpFileName(originalName: string): string {
    const stem = originalName.replace(/\.[^.]+$/, '') || 'image'
    return `${stem}.webp`
}

export async function compressImageFile(file: File): Promise<File> {
    const compressed = await imageCompression(file, IMAGE_COMPRESSION_OPTIONS)
    return new File([compressed], getWebpFileName(file.name), { type: 'image/webp' })
}
