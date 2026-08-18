import type { ReactNode } from 'react'
import type { PhotographTextPosition } from '@/lib/apis/photographs/types'
import { cn } from '@/lib/utils'

export type PhotographProjectLayoutMode = 'responsive' | 'pc' | 'mobile'

interface PhotographProjectLayoutProps {
    textPosition: PhotographTextPosition
    mode?: PhotographProjectLayoutMode
    textContent: ReactNode
    heroContent: ReactNode
    className?: string
    textClassName?: string
    heroClassName?: string
}

export function PhotographProjectLayout({
    textPosition,
    mode = 'responsive',
    textContent,
    heroContent,
    className,
    textClassName,
    heroClassName,
}: PhotographProjectLayoutProps) {
    return (
        <div className={cn(getLayoutClassName(mode), className)}>
            <div
                className={cn(
                    'flex min-w-0 items-center justify-center',
                    getTextOrderClassName(mode, textPosition),
                    textClassName,
                )}
            >
                {textContent}
            </div>
            <div
                className={cn(
                    'flex min-w-0 items-center justify-center',
                    getHeroOrderClassName(mode, textPosition),
                    heroClassName,
                )}
            >
                {heroContent}
            </div>
        </div>
    )
}

function getLayoutClassName(mode: PhotographProjectLayoutMode): string {
    if (mode === 'pc') return 'grid grid-cols-2 items-center gap-12'
    if (mode === 'mobile') return 'flex flex-col gap-10'
    return 'grid items-center gap-10 md:grid-cols-2 md:gap-12'
}

function getTextOrderClassName(
    mode: PhotographProjectLayoutMode,
    textPosition: PhotographTextPosition,
): string | undefined {
    if (textPosition !== 'right' || mode === 'mobile') return undefined
    return mode === 'responsive' ? 'md:order-2' : 'order-2'
}

function getHeroOrderClassName(
    mode: PhotographProjectLayoutMode,
    textPosition: PhotographTextPosition,
): string | undefined {
    if (textPosition !== 'right' || mode === 'mobile') return undefined
    return mode === 'responsive' ? 'md:order-1' : 'order-1'
}
