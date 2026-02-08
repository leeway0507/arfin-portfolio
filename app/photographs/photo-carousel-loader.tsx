'use client'

import { useEffect, useState } from 'react'
import { EmblaOptionsType } from 'embla-carousel'
import { getPublicPhotoList } from '@/lib/apis/photos/api'
import { EmblaCarousel } from './embla-carousel'
import type { Slide } from './type'

export function PhotoCarouselLoader() {
    const [slides, setSlides] = useState<Slide[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        getPublicPhotoList()
            .then((items) => {
                const nextSlides: Slide[] = items.map((item) => ({
                    src: item.imageUrl,
                    alt: item.caption || item.filename,
                }))
                setSlides(nextSlides)
            })
            .catch((e) => {
                setError(e instanceof Error ? e.message : '목록을 불러올 수 없습니다.')
            })
    }, [])

    if (error) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center p-8">
                <p className="text-muted-foreground">{error}</p>
            </div>
        )
    }

    if (!slides || slides.length === 0) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center p-8">
                <div
                    className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
                    aria-label="로딩 중"
                />
            </div>
        )
    }

    const options: EmblaOptionsType = { loop: true, duration: 0, containScroll: false }
    return <EmblaCarousel slides={slides} options={options} />
}
