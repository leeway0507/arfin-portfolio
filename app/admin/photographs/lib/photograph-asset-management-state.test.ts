import type { PhotographProjectMetadata } from '@/lib/apis/photographs/types'
import {
    createPhotographAssetManagementDraft,
    createPhotographAssetManagementUpdate,
    getPhotographAssetManagementState,
    getPhotographAssetUsage,
    togglePhotographAssetDeletion,
    updatePhotographAssetAlt,
} from './photograph-asset-management-state'

const project: PhotographProjectMetadata = {
    id: 'project',
    publication: 'Publication',
    title: 'Title',
    textPosition: 'left',
    heroImageId: 'hero',
    galleryImageIds: ['hero', 'gallery'],
    images: [
        createImage('hero', 'Hero alt'),
        createImage('gallery', 'Gallery alt'),
        createImage('unused', 'Unused alt'),
    ],
}

describe('photograph asset management state', () => {
    it('hero와 gallery 사용 위치를 독립적으로 표시하고 미사용을 구분한다', () => {
        expect(getPhotographAssetUsage(project, 'hero')).toEqual(['hero', 'gallery'])
        expect(getPhotographAssetUsage(project, 'gallery')).toEqual(['gallery'])
        expect(getPhotographAssetUsage(project, 'unused')).toEqual(['unused'])
    })

    it('hero 삭제는 막고 gallery·미사용 이미지는 여러 장 선택한다', () => {
        const draft = createPhotographAssetManagementDraft(project)
        const heroResult = togglePhotographAssetDeletion(project, draft, 'hero')
        const galleryResult = togglePhotographAssetDeletion(project, heroResult, 'gallery')
        const unusedResult = togglePhotographAssetDeletion(project, galleryResult, 'unused')

        expect(heroResult).toBe(draft)
        expect(unusedResult.deletedImageIds).toEqual(['gallery', 'unused'])
        expect(
            togglePhotographAssetDeletion(project, unusedResult, 'gallery').deletedImageIds,
        ).toEqual(['unused'])
    })

    it('삭제 선택 이미지는 alt 검증에서 제외하고 복원하면 기존 draft alt를 유지한다', () => {
        let draft = createPhotographAssetManagementDraft(project)
        draft = updatePhotographAssetAlt(draft, 'gallery', '')
        expect(getPhotographAssetManagementState(project, draft)).toEqual(
            expect.objectContaining({ isValid: false, firstInvalidImageId: 'gallery' }),
        )

        draft = togglePhotographAssetDeletion(project, draft, 'gallery')
        expect(getPhotographAssetManagementState(project, draft)).toEqual(
            expect.objectContaining({ isValid: true, deletedImageCount: 1 }),
        )

        draft = togglePhotographAssetDeletion(project, draft, 'gallery')
        expect(draft.altsByImageId.gallery).toBe('')
        expect(getPhotographAssetManagementState(project, draft).isValid).toBe(false)
    })

    it('alt 수정·삭제 개수와 변경 여부를 계산하고 서버 요청을 기존 이미지 순서로 만든다', () => {
        let draft = createPhotographAssetManagementDraft(project)
        draft = updatePhotographAssetAlt(draft, 'unused', ' Updated unused ')
        draft = togglePhotographAssetDeletion(project, draft, 'gallery')
        const state = getPhotographAssetManagementState(project, draft)
        const update = createPhotographAssetManagementUpdate('editorial', project, draft)

        expect(state).toEqual({
            hasChanges: true,
            isValid: true,
            editedAltCount: 1,
            deletedImageCount: 1,
            firstInvalidImageId: null,
        })
        expect(update).toEqual({
            sectionId: 'editorial',
            projectId: project.id,
            retainedImageAlts: [
                { imageId: 'hero', alt: 'Hero alt' },
                { imageId: 'unused', alt: 'Updated unused' },
            ],
            deletedImageIds: ['gallery'],
        })
    })

    it('초기 draft는 변경 없음이며 240자를 넘는 alt는 저장할 수 없다', () => {
        const draft = createPhotographAssetManagementDraft(project)
        expect(getPhotographAssetManagementState(project, draft)).toEqual(
            expect.objectContaining({ hasChanges: false, isValid: true }),
        )
        expect(
            getPhotographAssetManagementState(
                project,
                updatePhotographAssetAlt(draft, 'unused', 'a'.repeat(241)),
            ),
        ).toEqual(expect.objectContaining({ isValid: false, firstInvalidImageId: 'unused' }))
    })
})

function createImage(id: string, alt: string) {
    return {
        id,
        objectKey: `photographs/assets/${id}.webp`,
        alt,
        width: 100,
        height: 120,
    }
}
