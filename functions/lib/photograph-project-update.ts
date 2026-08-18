import type {
    PhotographManifest,
    PhotographProjectMetadata,
    PhotographProjectUpdate,
} from '../../lib/apis/photographs/types'

type PhotographProjectUpdateResult =
    | { ok: true; manifest: PhotographManifest; project: PhotographProjectMetadata }
    | { ok: false; error: string; status: 400 | 404 }

export function parsePhotographProjectUpdate(value: unknown): PhotographProjectUpdate | null {
    if (!isRecord(value)) return null

    const publication = parseRequiredText(value.publication, 120)
    const title = parseRequiredText(value.title, 120)
    if (
        !isNonEmptyString(value.sectionId) ||
        !isNonEmptyString(value.projectId) ||
        publication === null ||
        title === null ||
        (value.textPosition !== 'left' && value.textPosition !== 'right') ||
        !isNonEmptyString(value.heroImageId) ||
        !Array.isArray(value.galleryImageIds) ||
        !value.galleryImageIds.every(isNonEmptyString)
    ) {
        return null
    }

    return {
        sectionId: value.sectionId,
        projectId: value.projectId,
        publication,
        title,
        textPosition: value.textPosition,
        heroImageId: value.heroImageId,
        galleryImageIds: value.galleryImageIds,
    }
}

export function applyPhotographProjectUpdate(
    manifest: PhotographManifest,
    update: PhotographProjectUpdate,
): PhotographProjectUpdateResult {
    const sectionIndex = manifest.sections.findIndex((section) => section.id === update.sectionId)
    if (sectionIndex < 0) {
        return { ok: false, error: '수정할 대주제를 찾을 수 없습니다.', status: 404 }
    }

    const section = manifest.sections[sectionIndex]
    const projectIndex = section.projects.findIndex((project) => project.id === update.projectId)
    if (projectIndex < 0) {
        return { ok: false, error: '수정할 프로젝트를 찾을 수 없습니다.', status: 404 }
    }

    const project = section.projects[projectIndex]
    const assetIds = new Set(project.images.map((image) => image.id))
    if (!assetIds.has(update.heroImageId)) {
        return {
            ok: false,
            error: '상단 이미지가 프로젝트 이미지에 포함되지 않습니다.',
            status: 400,
        }
    }
    if (
        new Set(update.galleryImageIds).size !== update.galleryImageIds.length ||
        !update.galleryImageIds.every((imageId) => assetIds.has(imageId))
    ) {
        return {
            ok: false,
            error: '하단 이미지는 프로젝트 이미지를 중복 없이 포함해야 합니다.',
            status: 400,
        }
    }

    const updatedProject: PhotographProjectMetadata = {
        ...project,
        publication: update.publication,
        title: update.title,
        textPosition: update.textPosition,
        heroImageId: update.heroImageId,
        galleryImageIds: update.galleryImageIds,
    }
    const updatedSection = {
        ...section,
        projects: section.projects.map((currentProject, index) =>
            index === projectIndex ? updatedProject : currentProject,
        ),
    }
    const updatedManifest = {
        ...manifest,
        sections: manifest.sections.map((currentSection, index) =>
            index === sectionIndex ? updatedSection : currentSection,
        ),
    }

    return { ok: true, manifest: updatedManifest, project: updatedProject }
}

function parseRequiredText(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') return null
    const text = value.trim()
    return text.length > 0 && text.length <= maxLength ? text : null
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}
