'use client'

import { useEffect, useRef } from 'react'
import { getPhotographWheelDirection } from '../lib/photograph-carousel-state'

interface PhotographWheelStepNavigationOptions {
    canNavigate: boolean
    onShowNextImage: () => void
    onShowPreviousImage: () => void
    viewportElement: HTMLElement | null
}

interface PhotographWheelStepNavigationLatestState {
    canNavigate: boolean
    onShowNextImage: () => void
    onShowPreviousImage: () => void
}

export function usePhotographWheelStepNavigation({
    canNavigate,
    onShowNextImage,
    onShowPreviousImage,
    viewportElement,
}: PhotographWheelStepNavigationOptions) {
    const latestStateRef = useRef<PhotographWheelStepNavigationLatestState>({
        canNavigate,
        onShowNextImage,
        onShowPreviousImage,
    })
    latestStateRef.current = { canNavigate, onShowNextImage, onShowPreviousImage }

    useEffect(() => {
        if (!viewportElement) return

        let isGestureLocked = false
        let gestureEndTimeout: number | null = null

        const resetGestureEndTimeout = () => {
            if (gestureEndTimeout !== null) window.clearTimeout(gestureEndTimeout)
            gestureEndTimeout = window.setTimeout(() => {
                gestureEndTimeout = null
                isGestureLocked = false
            }, WHEEL_GESTURE_END_MS)
        }

        const handleWheel = (event: WheelEvent) => {
            if (event.ctrlKey) return

            const latestState = latestStateRef.current
            const direction = getPhotographWheelDirection(event.deltaX, event.deltaY, false)

            if (isGestureLocked) {
                resetGestureEndTimeout()
                if (latestState.canNavigate && direction !== null) event.preventDefault()
                return
            }

            if (!latestState.canNavigate || direction === null) return

            event.preventDefault()
            isGestureLocked = true
            resetGestureEndTimeout()
            if (direction === 'next') {
                latestState.onShowNextImage()
                return
            }

            latestState.onShowPreviousImage()
        }

        viewportElement.addEventListener('wheel', handleWheel, { passive: false })
        return () => {
            viewportElement.removeEventListener('wheel', handleWheel)
            if (gestureEndTimeout !== null) window.clearTimeout(gestureEndTimeout)
        }
    }, [viewportElement])
}

const WHEEL_GESTURE_END_MS = 220
