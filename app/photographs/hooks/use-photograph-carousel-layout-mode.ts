'use client'

import { useLayoutEffect, useState } from 'react'

interface PhotographCarouselLayoutMode {
    isLayoutMeasured: boolean
    isUnderfilled: boolean
}

export function usePhotographCarouselLayoutMode(
    viewportElement: HTMLElement | null,
    carouselContentKey: string,
): PhotographCarouselLayoutMode {
    const [layoutMode, setLayoutMode] = useState<PhotographCarouselLayoutMode>({
        isLayoutMeasured: false,
        isUnderfilled: false,
    })

    useLayoutEffect(() => {
        if (!viewportElement) return

        const trackElement = viewportElement.firstElementChild
        if (!(trackElement instanceof HTMLElement)) return

        const slideElements = Array.from(trackElement.children).filter(
            (element): element is HTMLElement => element instanceof HTMLElement,
        )
        const measureLayoutMode = () => {
            const slideMeasurements = slideElements.map(getSlideMeasurement)
            const trailingSpacing = slideMeasurements.at(-1)?.horizontalSpacing ?? 0
            const carouselContentWidth =
                slideMeasurements.reduce(
                    (totalWidth, slideMeasurement) =>
                        totalWidth +
                        slideMeasurement.imageWidth +
                        slideMeasurement.horizontalSpacing,
                    0,
                ) - trailingSpacing
            const spacingTolerance = slideMeasurements.reduce(
                (largestSpacing, slideMeasurement) =>
                    Math.max(largestSpacing, slideMeasurement.horizontalSpacing),
                0,
            )
            const isUnderfilled =
                carouselContentWidth <=
                viewportElement.clientWidth +
                    spacingTolerance +
                    CAROUSEL_MEASUREMENT_TOLERANCE_PX

            setLayoutMode((currentLayoutMode) => {
                if (
                    currentLayoutMode.isLayoutMeasured &&
                    currentLayoutMode.isUnderfilled === isUnderfilled
                ) {
                    return currentLayoutMode
                }

                return { isLayoutMeasured: true, isUnderfilled }
            })
        }

        measureLayoutMode()
        const resizeObserver = new window.ResizeObserver(measureLayoutMode)
        resizeObserver.observe(viewportElement)
        slideElements.forEach((slideElement) => resizeObserver.observe(slideElement))
        return () => resizeObserver.disconnect()
    }, [carouselContentKey, viewportElement])

    return layoutMode
}

function getSlideMeasurement(slideElement: HTMLElement) {
    const slideStyle = window.getComputedStyle(slideElement)
    return {
        imageWidth: slideElement.getBoundingClientRect().width,
        horizontalSpacing:
            parsePixelValue(slideStyle.marginLeft) + parsePixelValue(slideStyle.marginRight),
    }
}

function parsePixelValue(value: string) {
    const parsedValue = Number.parseFloat(value)
    return Number.isFinite(parsedValue) ? parsedValue : 0
}

const CAROUSEL_MEASUREMENT_TOLERANCE_PX = 2
