interface PhotographCarouselAutoAdvanceState {
    canAdvance: boolean
    isMotionReduced: boolean
    isAutoAdvancePaused: boolean
    isAutoAdvanceStopped: boolean
    isCarouselVisible: boolean
    isDocumentVisible: boolean
    isLightboxOpen: boolean
}

export function shouldRunPhotographCarouselAutoAdvance(
    state: PhotographCarouselAutoAdvanceState,
): boolean {
    return (
        state.canAdvance &&
        !state.isMotionReduced &&
        !state.isAutoAdvancePaused &&
        !state.isAutoAdvanceStopped &&
        state.isCarouselVisible &&
        state.isDocumentVisible &&
        !state.isLightboxOpen
    )
}

export function isHorizontalWheelIntent(
    deltaX: number,
    deltaY: number,
    isPinchGesture: boolean,
): boolean {
    return !isPinchGesture && Math.abs(deltaX) >= 2 && Math.abs(deltaX) > Math.abs(deltaY)
}

export function getPhotographWheelDirection(
    deltaX: number,
    deltaY: number,
    isPinchGesture: boolean,
): 'previous' | 'next' | null {
    if (!isHorizontalWheelIntent(deltaX, deltaY, isPinchGesture)) return null
    return deltaX > 0 ? 'next' : 'previous'
}

export function getPhotographCarouselImageSizes(width: number, height: number): string {
    const safeRatio = width > 0 && height > 0 ? width / height : 1
    const desktopWidth = Math.max(1, Math.round(264 * safeRatio))
    const mobileWidth = Math.max(1, Math.round(216 * safeRatio))
    return `(min-width: 640px) ${desktopWidth}px, ${mobileWidth}px`
}
