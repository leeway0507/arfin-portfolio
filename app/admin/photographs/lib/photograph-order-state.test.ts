import type { PhotographSectionMetadata } from '@/lib/apis/photographs/types'
import {
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
})

function createSections(ids: string[]): PhotographSectionMetadata[] {
    return ids.map((id) => ({ id, title: id, projects: [] }))
}
