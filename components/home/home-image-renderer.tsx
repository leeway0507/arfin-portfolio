'use client'

import Image from 'next/image'
import type { CSSProperties } from 'react'
import type { HomeImageLayout } from '@/lib/apis/home/types'
import { DEFAULT_HOME_IMAGE_LAYOUT } from '@/lib/apis/home/layout'
import { cn } from '@/lib/utils'

type HomeImageRendererProps = {
    src: string
    alt: string
    layout?: HomeImageLayout
    priority?: boolean
    className?: string
    forceMode?: 'pc' | 'mobile'
    onError?: () => void
}

export function HomeImageRenderer({
    src,
    alt,
    layout = DEFAULT_HOME_IMAGE_LAYOUT,
    priority = false,
    className,
    forceMode,
    onError,
}: HomeImageRendererProps) {
    const width = `${layout.mobileWidthPercent}%`
    const isLocalPreview = src.startsWith('blob:') || src.startsWith('data:')

    return (
        <div
            className={cn(
                'm-auto',
                !forceMode && 'sm:[width:var(--home-image-desktop-width)]',
                forceMode === 'pc' && '[width:var(--home-image-desktop-width)]',
                className,
            )}
            style={
                {
                    width: forceMode === 'pc' ? 'var(--home-image-desktop-width)' : width,
                    maxWidth: `${layout.maxWidth}px`,
                    '--home-image-desktop-width': `${layout.desktopWidthPercent}%`,
                } as CSSProperties
            }
        >
            <div className="relative aspect-[1.53/1]">
                {isLocalPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={alt} className="h-full w-full object-contain" />
                ) : (
                    <Image
                        src={src}
                        alt={alt}
                        priority={priority}
                        fill
                        style={{ objectFit: 'contain' }}
                        sizes={`(min-width: 640px) ${layout.desktopWidthPercent}vw, ${layout.mobileWidthPercent}vw`}
                        onError={onError}
                    />
                )}
            </div>
        </div>
    )
}
