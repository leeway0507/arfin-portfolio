import type { HomeImageLayout, HomeImageSizePreset } from './types'

export const DEFAULT_HOME_IMAGE_LAYOUT: HomeImageLayout = {
    preset: 'default',
    desktopWidthPercent: 55,
    mobileWidthPercent: 95,
    maxWidth: 640,
}

export const HOME_IMAGE_LAYOUT_PRESETS: Record<
    Exclude<HomeImageSizePreset, 'custom'>,
    HomeImageLayout
> = {
    compact: {
        preset: 'compact',
        desktopWidthPercent: 45,
        mobileWidthPercent: 90,
        maxWidth: 520,
    },
    default: DEFAULT_HOME_IMAGE_LAYOUT,
    wide: {
        preset: 'wide',
        desktopWidthPercent: 68,
        mobileWidthPercent: 95,
        maxWidth: 840,
    },
    full: {
        preset: 'full',
        desktopWidthPercent: 82,
        mobileWidthPercent: 95,
        maxWidth: 1040,
    },
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
    return Math.min(max, Math.max(min, Math.round(value)))
}

export function normalizeHomeImageLayout(layout?: Partial<HomeImageLayout> | null): HomeImageLayout {
    if (!layout) return DEFAULT_HOME_IMAGE_LAYOUT
    const preset = layout.preset ?? 'default'

    if (preset !== 'custom' && preset in HOME_IMAGE_LAYOUT_PRESETS) {
        return HOME_IMAGE_LAYOUT_PRESETS[preset as Exclude<HomeImageSizePreset, 'custom'>]
    }

    return {
        preset: 'custom',
        desktopWidthPercent: clamp(
            layout.desktopWidthPercent,
            30,
            95,
            DEFAULT_HOME_IMAGE_LAYOUT.desktopWidthPercent,
        ),
        mobileWidthPercent: clamp(
            layout.mobileWidthPercent,
            70,
            100,
            DEFAULT_HOME_IMAGE_LAYOUT.mobileWidthPercent,
        ),
        maxWidth: clamp(layout.maxWidth, 420, 1920, DEFAULT_HOME_IMAGE_LAYOUT.maxWidth),
    }
}
