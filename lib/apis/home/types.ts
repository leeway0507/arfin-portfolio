export const HOME_IMAGE_SIZE_PRESETS = ['compact', 'default', 'wide', 'full', 'custom'] as const

export type HomeImageSizePreset = (typeof HOME_IMAGE_SIZE_PRESETS)[number]

export interface HomeImageLayout {
    preset: HomeImageSizePreset
    desktopWidthPercent: number
    mobileWidthPercent: number
    maxWidth: number
}

export interface HomeImage {
    imageKey: string | null
    imageUrl: string | null
    alt: string
    updatedAt: string | null
    layout: HomeImageLayout
}

export interface HomeImageApiResponse {
    imageKey?: string | null
    alt?: string
    updatedAt?: string | null
    layout?: Partial<HomeImageLayout> | null
}
