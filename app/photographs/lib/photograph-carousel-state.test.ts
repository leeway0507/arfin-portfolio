import {
    getPhotographWheelDirection,
    getPhotographCarouselImageSizes,
    isHorizontalWheelIntent,
    shouldRunPhotographCarouselAutoAdvance,
} from './photograph-carousel-state'

const activeState = {
    canAdvance: true,
    isMotionReduced: false,
    isAutoAdvancePaused: false,
    isAutoAdvanceStopped: false,
    isCarouselVisible: true,
    isDocumentVisible: true,
    isLightboxOpen: false,
}

describe('photograph carousel state', () => {
    it('실제로 보이고 동작 가능한 carousel만 자동 순환한다', () => {
        expect(shouldRunPhotographCarouselAutoAdvance(activeState)).toBe(true)
    })

    it.each([
        ['사진을 넘길 수 없음', { canAdvance: false }],
        ['reduced motion', { isMotionReduced: true }],
        ['5초 수동 정지', { isAutoAdvancePaused: true }],
        ['영구 정지', { isAutoAdvanceStopped: true }],
        ['화면 밖', { isCarouselVisible: false }],
        ['비활성 탭', { isDocumentVisible: false }],
        ['전체 화면 열림', { isLightboxOpen: true }],
    ])('%s 상태에서는 자동 순환하지 않는다', (_label, state) => {
        expect(shouldRunPhotographCarouselAutoAdvance({ ...activeState, ...state })).toBe(false)
    })

    it('가로 의도가 분명한 wheel 입력만 carousel 조작으로 판단한다', () => {
        expect(isHorizontalWheelIntent(24, 3, false)).toBe(true)
        expect(isHorizontalWheelIntent(1, 0, false)).toBe(false)
        expect(isHorizontalWheelIntent(4, 12, false)).toBe(false)
        expect(isHorizontalWheelIntent(8, 8, false)).toBe(false)
        expect(isHorizontalWheelIntent(24, 3, true)).toBe(false)
    })

    it('wheel의 수평 방향을 이전 또는 다음 사진 이동으로 변환한다', () => {
        expect(getPhotographWheelDirection(24, 3, false)).toBe('next')
        expect(getPhotographWheelDirection(-24, 3, false)).toBe('previous')
        expect(getPhotographWheelDirection(4, 12, false)).toBeNull()
        expect(getPhotographWheelDirection(24, 3, true)).toBeNull()
    })

    it('이미지 비율과 실제 carousel 높이로 sizes 폭을 계산한다', () => {
        expect(getPhotographCarouselImageSizes(1920, 1200)).toBe('(min-width: 640px) 422px, 346px')
        expect(getPhotographCarouselImageSizes(1200, 1920)).toBe('(min-width: 640px) 165px, 135px')
    })
})
