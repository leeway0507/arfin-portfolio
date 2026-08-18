import type { PhotographSection } from '@/lib/apis/photographs/types'

export function getVisiblePhotographSections(sections: PhotographSection[]): PhotographSection[] {
    return sections.filter((section) => section.projects.length > 0)
}

export function getPublicPhotographProjectIds(sections: PhotographSection[]): string[] {
    return getVisiblePhotographSections(sections).flatMap((section) =>
        section.projects.map((project) => project.id),
    )
}
