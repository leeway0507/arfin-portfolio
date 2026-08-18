import type {
    PhotographProjectMetadata,
    PhotographSectionMetadata,
} from '@/lib/apis/photographs/types'
import type { PhotographManagementChangeMode } from '../types'

interface PhotographManagementDirtyState {
    hasProjectChanges: boolean
    hasProjectOrderChanges: boolean
    hasSectionOrderChanges: boolean
}

export function mapProjectsToDraftOrder(
    projects: PhotographProjectMetadata[],
    projectOrderDraft: string[],
): PhotographProjectMetadata[] {
    return mapItemsToDraftOrder(projects, projectOrderDraft)
}

export function mapSectionsToDraftOrder(
    sections: PhotographSectionMetadata[],
    sectionOrderDraft: string[],
): PhotographSectionMetadata[] {
    return mapItemsToDraftOrder(sections, sectionOrderDraft)
}

export function movePhotographOrderId(ids: string[], activeId: string, overId: string): string[] {
    const activeIndex = ids.indexOf(activeId)
    const overIndex = ids.indexOf(overId)
    if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return ids

    const nextIds = [...ids]
    const [movedId] = nextIds.splice(activeIndex, 1)
    nextIds.splice(overIndex, 0, movedId)
    return nextIds
}

export function hasPhotographOrderChanges(savedIds: string[], draftIds: string[]): boolean {
    return !arraysEqual(savedIds, draftIds)
}

export function getPhotographManagementChangeState({
    hasProjectChanges,
    hasProjectOrderChanges,
    hasSectionOrderChanges,
}: PhotographManagementDirtyState): {
    changeMode: PhotographManagementChangeMode
    hasInvalidConcurrentChanges: boolean
} {
    const activeModes = [
        hasProjectChanges ? 'project' : null,
        hasProjectOrderChanges ? 'project-order' : null,
        hasSectionOrderChanges ? 'section-order' : null,
    ].filter((mode): mode is Exclude<PhotographManagementChangeMode, null> => mode !== null)

    return {
        changeMode: activeModes.length === 1 ? activeModes[0] : null,
        hasInvalidConcurrentChanges: activeModes.length > 1,
    }
}

function mapItemsToDraftOrder<T extends { id: string }>(items: T[], draftIds: string[]): T[] {
    const itemById = new Map(items.map((item) => [item.id, item]))
    const orderedItems = draftIds.flatMap((itemId) => {
        const item = itemById.get(itemId)
        return item ? [item] : []
    })
    const isExactOrder =
        orderedItems.length === items.length && new Set(draftIds).size === items.length
    return isExactOrder ? orderedItems : items
}

function arraysEqual(left: string[], right: string[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index])
}
