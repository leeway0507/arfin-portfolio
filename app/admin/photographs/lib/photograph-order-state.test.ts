import type { PhotographSectionMetadata } from '@/lib/apis/photographs/types'
import {
    getPhotographManagementChangeState,
    hasPhotographOrderChanges,
    mapSectionsToDraftOrder,
    movePhotographOrderId,
} from './photograph-order-state'

describe('photograph order state', () => {
    const savedOrder = ['first', 'second', 'third']

    it('첫 이동과 연속 이동을 draft 순서에 반영한다', () => {
        const firstMove = movePhotographOrderId(savedOrder, 'first', 'third')
        const secondMove = movePhotographOrderId(firstMove, 'second', 'first')

        expect(firstMove).toEqual(['second', 'third', 'first'])
        expect(secondMove).toEqual(['third', 'first', 'second'])
        expect(hasPhotographOrderChanges(savedOrder, secondMove)).toBe(true)
    })

    it('저장 순서로 되돌아오면 order dirty가 자동 해제된다', () => {
        const changedOrder = movePhotographOrderId(savedOrder, 'first', 'second')
        const restoredOrder = movePhotographOrderId(changedOrder, 'first', 'second')

        expect(changedOrder).toEqual(['second', 'first', 'third'])
        expect(restoredOrder).toEqual(savedOrder)
        expect(hasPhotographOrderChanges(savedOrder, restoredOrder)).toBe(false)
    })

    it('유효한 draft 순서를 적용하고 invalid draft는 저장 순서로 fallback한다', () => {
        const sections = createSections(savedOrder)

        expect(mapSectionsToDraftOrder(sections, ['third', 'first', 'second'])).toEqual([
            sections[2],
            sections[0],
            sections[1],
        ])
        expect(mapSectionsToDraftOrder(sections, ['first', 'missing'])).toBe(sections)
        expect(mapSectionsToDraftOrder(sections, ['first', 'first', 'third'])).toBe(sections)
    })

    it.each([
        [true, false, false, 'project'],
        [false, true, false, 'project-order'],
        [false, false, true, 'section-order'],
        [false, false, false, null],
    ] as const)(
        '단일 dirty 상태만 유효한 mode로 만든다',
        (hasProjectChanges, hasProjectOrderChanges, hasSectionOrderChanges, expectedMode) => {
            expect(
                getPhotographManagementChangeState({
                    hasProjectChanges,
                    hasProjectOrderChanges,
                    hasSectionOrderChanges,
                }),
            ).toEqual({ changeMode: expectedMode, hasInvalidConcurrentChanges: false })
        },
    )

    it.each([
        [true, true, false],
        [true, false, true],
        [false, true, true],
        [true, true, true],
    ])('복수 dirty 상태를 저장 가능한 mode로 숨기지 않는다', (...dirtyStates) => {
        expect(
            getPhotographManagementChangeState({
                hasProjectChanges: dirtyStates[0],
                hasProjectOrderChanges: dirtyStates[1],
                hasSectionOrderChanges: dirtyStates[2],
            }),
        ).toEqual({ changeMode: null, hasInvalidConcurrentChanges: true })
    })
})

function createSections(ids: string[]): PhotographSectionMetadata[] {
    return ids.map((id) => ({ id, title: id, projects: [] }))
}
