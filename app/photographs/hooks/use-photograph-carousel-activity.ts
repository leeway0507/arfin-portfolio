'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

interface PhotographCarouselActivity {
    carouselRegionRef: RefObject<HTMLDivElement | null>
    isCarouselVisible: boolean
    isDocumentVisible: boolean
}

export function usePhotographCarouselActivity(): PhotographCarouselActivity {
    const carouselRegionRef = useRef<HTMLDivElement>(null)
    const [isCarouselVisible, setIsCarouselVisible] = useState(false)
    const [isDocumentVisible, setIsDocumentVisible] = useState(
        () => typeof document === 'undefined' || document.visibilityState === 'visible',
    )

    useEffect(() => {
        const region = carouselRegionRef.current
        if (!region) return
        if (!('IntersectionObserver' in window)) return

        const observer = new IntersectionObserver(
            ([entry]) =>
                setIsCarouselVisible(entry.isIntersecting && entry.intersectionRatio >= 0.15),
            { rootMargin: '0px', threshold: [0, 0.15] },
        )
        observer.observe(region)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        const syncDocumentVisibility = () => {
            setIsDocumentVisible(document.visibilityState === 'visible')
        }

        document.addEventListener('visibilitychange', syncDocumentVisibility)
        return () => document.removeEventListener('visibilitychange', syncDocumentVisibility)
    }, [])

    return { carouselRegionRef, isCarouselVisible, isDocumentVisible }
}
