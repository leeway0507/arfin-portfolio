import type {
    PhotographProjectMetadata,
    PhotographSectionMetadata,
} from '@/lib/apis/photographs/types'

export interface PhotographWorkspaceSelection {
    section: PhotographSectionMetadata | null
    project: PhotographProjectMetadata | null
    projectOrder: string[]
}

export function getPhotographWorkspaceSelection(
    sections: PhotographSectionMetadata[],
    preferredSectionId?: string | null,
    preferredProjectId?: string | null,
): PhotographWorkspaceSelection {
    const section = sections.find((item) => item.id === preferredSectionId) ?? sections[0] ?? null
    if (!section) return { section: null, project: null, projectOrder: [] }

    return {
        section,
        project: getSectionProjectSelection(section, preferredProjectId),
        projectOrder: section.projects.map((project) => project.id),
    }
}

export function getSectionProjectSelection(
    section: PhotographSectionMetadata,
    preferredProjectId?: string | null,
): PhotographProjectMetadata | null {
    return (
        section.projects.find((project) => project.id === preferredProjectId) ??
        section.projects[0] ??
        null
    )
}

export function replacePhotographSection(
    sections: PhotographSectionMetadata[],
    section: PhotographSectionMetadata,
): PhotographSectionMetadata[] {
    return sections.map((item) => (item.id === section.id ? section : item))
}

export function replacePhotographProject(
    sections: PhotographSectionMetadata[],
    sectionId: string,
    project: PhotographProjectMetadata,
): PhotographSectionMetadata[] {
    return sections.map((section) =>
        section.id === sectionId
            ? {
                  ...section,
                  projects: section.projects.map((item) =>
                      item.id === project.id ? project : item,
                  ),
              }
            : section,
    )
}

export function getSectionSelectionAfterDelete(
    previousSections: PhotographSectionMetadata[],
    deletedSectionId: string,
    nextSections: PhotographSectionMetadata[],
): PhotographSectionMetadata | null {
    const deletedIndex = previousSections.findIndex((section) => section.id === deletedSectionId)
    if (deletedIndex < 0 || nextSections.length === 0) return null
    return nextSections[Math.min(deletedIndex, nextSections.length - 1)] ?? null
}

export function getProjectSelectionAfterDelete(
    previousProjects: PhotographProjectMetadata[],
    deletedProjectId: string,
    nextProjects: PhotographProjectMetadata[],
): PhotographProjectMetadata | null {
    const deletedIndex = previousProjects.findIndex((project) => project.id === deletedProjectId)
    if (deletedIndex < 0) return nextProjects[0] ?? null
    return nextProjects[Math.min(deletedIndex, nextProjects.length - 1)] ?? null
}

export function isPhotographProjectDeleteConfirmationValid(
    project: PhotographProjectMetadata,
    confirmation: string,
): boolean {
    return confirmation === project.title
}

export function isPhotographSectionDeleteConfirmationValid(
    section: PhotographSectionMetadata,
    confirmation: string,
): boolean {
    return section.projects.length === 0 && confirmation === section.title
}

export function findKeyboardTargetId(key: string, ids: string[], currentId: string): string | null {
    const currentIndex = ids.indexOf(currentId)
    if (currentIndex < 0 || ids.length === 0) return null
    if (key === 'Home') return ids[0] ?? null
    if (key === 'End') return ids.at(-1) ?? null
    if (key !== 'ArrowLeft' && key !== 'ArrowRight') return null

    const offset = key === 'ArrowLeft' ? -1 : 1
    const nextIndex = (currentIndex + offset + ids.length) % ids.length
    return ids[nextIndex] ?? null
}
