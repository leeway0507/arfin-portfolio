import type { PhotographProject, PhotographSection } from '@/lib/apis/photographs/types'
import {
    getPublicPhotographProjectIds,
    getVisiblePhotographSections,
} from './photographs-public-state'

const firstProject = createProject('first-project')
const secondProject = createProject('second-project')
const thirdProject = createProject('third-project')
const sections: PhotographSection[] = [
    { id: 'editorial', title: 'Editorial', projects: [firstProject, secondProject] },
    { id: 'empty', title: 'Empty', projects: [] },
    { id: 'cover', title: 'Cover', projects: [thirdProject] },
]

describe('photographs public state', () => {
    it('빈 대주제를 생략하고 manifest 대주제 순서를 유지한다', () => {
        expect(getVisiblePhotographSections(sections).map((section) => section.id)).toEqual([
            'editorial',
            'cover',
        ])
    })

    it('대주제와 소주제 배열 순서대로 공개 프로젝트를 펼친다', () => {
        expect(getPublicPhotographProjectIds(sections)).toEqual([
            firstProject.id,
            secondProject.id,
            thirdProject.id,
        ])
    })

    it('수정된 대주제 이름을 공개 상태에 그대로 전달한다', () => {
        const renamedSection = { ...sections[0], title: 'Editorial Highlights' }

        expect(getVisiblePhotographSections([renamedSection])[0].title).toBe('Editorial Highlights')
    })

    it('삭제된 소주제를 공개 목록에서 제외하고 마지막 소주제가 없으면 대주제도 생략한다', () => {
        const afterProjectDelete = [
            { ...sections[0], projects: [secondProject] },
            sections[1],
            { ...sections[2], projects: [] },
        ]

        expect(getPublicPhotographProjectIds(afterProjectDelete)).toEqual([secondProject.id])
        expect(
            getVisiblePhotographSections(afterProjectDelete).map((section) => section.id),
        ).toEqual(['editorial'])
    })

    it('모든 대주제가 비어 있으면 공개 대주제가 없다', () => {
        expect(
            getVisiblePhotographSections([{ id: 'editorial', title: 'Editorial', projects: [] }]),
        ).toEqual([])
    })
})

function createProject(id: string): PhotographProject {
    return {
        id,
        publication: id,
        title: id,
        textPosition: 'left',
        heroImageId: `${id}-image`,
        galleryImageIds: [],
        images: [
            {
                id: `${id}-image`,
                objectKey: `${id}.webp`,
                imageUrl: `https://example.com/${id}.webp`,
                alt: id,
                width: 100,
                height: 120,
            },
        ],
    }
}
