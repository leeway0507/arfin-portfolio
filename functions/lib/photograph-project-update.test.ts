import fixture from '../../scripts/fixtures/hong-kong-photographs-manifest.json'
import type { PhotographManifest, PhotographProjectUpdate } from '../../lib/apis/photographs/types'
import {
    applyPhotographProjectUpdate,
    parsePhotographProjectUpdate,
} from './photograph-project-update'

const manifest = fixture as PhotographManifest
const project = manifest.sections[0].projects[0]
const baseUpdate: PhotographProjectUpdate = {
    sectionId: manifest.sections[0].id,
    projectId: project.id,
    publication: project.publication,
    title: project.title,
    textPosition: project.textPosition,
    heroImageId: project.heroImageId,
    galleryImageIds: project.galleryImageIds,
}

describe('parsePhotographProjectUpdate', () => {
    it('문구 양끝 공백을 제거하고 허용된 필드만 반환한다', () => {
        expect(
            parsePhotographProjectUpdate({
                ...baseUpdate,
                publication: `  ${baseUpdate.publication}  `,
                title: `  ${baseUpdate.title}  `,
                images: ['수정되면 안 되는 값'],
            }),
        ).toEqual(baseUpdate)
    })

    it('빈 문구, 잘못된 위치, 120자를 넘는 문구를 거부한다', () => {
        expect(parsePhotographProjectUpdate({ ...baseUpdate, publication: '   ' })).toBeNull()
        expect(parsePhotographProjectUpdate({ ...baseUpdate, textPosition: 'center' })).toBeNull()
        expect(parsePhotographProjectUpdate({ ...baseUpdate, title: 'a'.repeat(121) })).toBeNull()
    })
})

describe('applyPhotographProjectUpdate', () => {
    it('asset metadata를 보존하면서 편집 필드만 변경한다', () => {
        const nextGalleryImageIds = [...baseUpdate.galleryImageIds].reverse()
        const result = applyPhotographProjectUpdate(manifest, {
            ...baseUpdate,
            publication: 'Updated publication',
            title: 'Updated title',
            textPosition: 'right',
            heroImageId: nextGalleryImageIds[0],
            galleryImageIds: nextGalleryImageIds,
        })

        expect(result.ok).toBe(true)
        if (!result.ok) return

        expect(result.project).toEqual({
            ...project,
            publication: 'Updated publication',
            title: 'Updated title',
            textPosition: 'right',
            heroImageId: nextGalleryImageIds[0],
            galleryImageIds: nextGalleryImageIds,
        })
        expect(result.project.images).toEqual(project.images)
        expect(manifest.sections[0].projects[0]).toEqual(project)
    })

    it('같은 manifest의 다른 프로젝트는 변경하지 않는다', () => {
        const otherProject = { ...project, id: 'other-project', title: 'Other project' }
        const manifestWithOtherProject: PhotographManifest = {
            ...manifest,
            sections: [
                {
                    ...manifest.sections[0],
                    projects: [project, otherProject],
                },
            ],
        }

        const result = applyPhotographProjectUpdate(manifestWithOtherProject, {
            ...baseUpdate,
            title: 'Updated title',
        })

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.manifest.sections[0].projects[1]).toBe(otherProject)
    })

    it('상단 이미지를 하단에도 독립적으로 사용할 수 있다', () => {
        const result = applyPhotographProjectUpdate(manifest, {
            ...baseUpdate,
            galleryImageIds: [baseUpdate.heroImageId, ...baseUpdate.galleryImageIds],
        })

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.project.heroImageId).toBe(baseUpdate.heroImageId)
        expect(result.project.galleryImageIds[0]).toBe(baseUpdate.heroImageId)
    })

    it('하단 목록 변경이 상단 이미지를 바꾸지 않는다', () => {
        const result = applyPhotographProjectUpdate(manifest, {
            ...baseUpdate,
            galleryImageIds: [],
        })

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.project.heroImageId).toBe(baseUpdate.heroImageId)
        expect(result.project.galleryImageIds).toEqual([])
    })

    it('중복되거나 프로젝트에 없는 하단 이미지 ID를 거부한다', () => {
        expect(
            applyPhotographProjectUpdate(manifest, {
                ...baseUpdate,
                galleryImageIds: [baseUpdate.galleryImageIds[0], baseUpdate.galleryImageIds[0]],
            }),
        ).toEqual(expect.objectContaining({ ok: false, status: 400 }))
        expect(
            applyPhotographProjectUpdate(manifest, {
                ...baseUpdate,
                galleryImageIds: ['unknown-image'],
            }),
        ).toEqual(expect.objectContaining({ ok: false, status: 400 }))
    })

    it('프로젝트에 없는 상단 이미지 ID를 거부한다', () => {
        expect(
            applyPhotographProjectUpdate(manifest, {
                ...baseUpdate,
                heroImageId: 'unknown-image',
            }),
        ).toEqual(expect.objectContaining({ ok: false, status: 400 }))
    })
})
