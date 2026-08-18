import type {
    PhotographProjectMetadata,
    PhotographSectionMetadata,
} from '@/lib/apis/photographs/types'
import {
    findKeyboardTargetId,
    getPhotographWorkspaceSelection,
    getProjectSelectionAfterDelete,
    getSectionSelectionAfterDelete,
    isPhotographProjectDeleteConfirmationValid,
    isPhotographSectionDeleteConfirmationValid,
    replacePhotographProject,
    replacePhotographSection,
} from './photographs-management-state'

const firstProject = createProject('first-project')
const secondProject = createProject('second-project')
const sections: PhotographSectionMetadata[] = [
    { id: 'editorial', title: 'Editorial', projects: [firstProject] },
    { id: 'cover', title: 'Cover', projects: [secondProject] },
    { id: 'empty', title: 'Empty', projects: [] },
]

describe('photographs management state', () => {
    it('기본 첫 대주제와 첫 소주제를 선택한다', () => {
        expect(getPhotographWorkspaceSelection(sections)).toEqual({
            section: sections[0],
            project: firstProject,
            projectOrder: [firstProject.id],
        })
    })

    it('선택 대주제 안에서만 선호 소주제를 복원한다', () => {
        expect(getPhotographWorkspaceSelection(sections, 'cover', secondProject.id)).toEqual({
            section: sections[1],
            project: secondProject,
            projectOrder: [secondProject.id],
        })
        expect(getPhotographWorkspaceSelection(sections, 'cover', firstProject.id).project).toBe(
            secondProject,
        )
    })

    it('빈 대주제는 오류 대신 project null 상태를 만든다', () => {
        expect(getPhotographWorkspaceSelection(sections, 'empty')).toEqual({
            section: sections[2],
            project: null,
            projectOrder: [],
        })
        expect(getPhotographWorkspaceSelection([])).toEqual({
            section: null,
            project: null,
            projectOrder: [],
        })
    })

    it('대주제 또는 소주제 갱신 시 다른 대주제 객체를 보존한다', () => {
        const updatedCover = { ...sections[1], title: 'Cover Highlights' }
        const updatedProject = { ...firstProject, title: 'Updated' }

        const sectionResult = replacePhotographSection(sections, updatedCover)
        const projectResult = replacePhotographProject(sections, 'editorial', updatedProject)

        expect(sectionResult[1]).toBe(updatedCover)
        expect(sectionResult[0]).toBe(sections[0])
        expect(projectResult[0].projects[0]).toBe(updatedProject)
        expect(projectResult[1]).toBe(sections[1])
    })

    it('대주제 삭제 후 같은 index의 다음, 없으면 이전, 전체 삭제면 null을 선택한다', () => {
        expect(getSectionSelectionAfterDelete(sections, 'cover', [sections[0], sections[2]])).toBe(
            sections[2],
        )
        expect(getSectionSelectionAfterDelete(sections, 'empty', [sections[0], sections[1]])).toBe(
            sections[1],
        )
        expect(getSectionSelectionAfterDelete([sections[0]], 'editorial', [])).toBeNull()
    })

    it('소주제 삭제 후 같은 index의 다음, 없으면 이전, 전체 삭제면 null을 선택한다', () => {
        const projects = [firstProject, secondProject, createProject('third-project')]

        expect(
            getProjectSelectionAfterDelete(projects, secondProject.id, [firstProject, projects[2]]),
        ).toBe(projects[2])
        expect(
            getProjectSelectionAfterDelete(projects, projects[2].id, [firstProject, secondProject]),
        ).toBe(secondProject)
        expect(getProjectSelectionAfterDelete([firstProject], firstProject.id, [])).toBeNull()
        expect(getProjectSelectionAfterDelete(projects, 'missing', projects)).toBe(firstProject)
    })

    it('정확한 대소문자 소주제 제목을 입력한 경우만 삭제 확인으로 인정한다', () => {
        expect(isPhotographProjectDeleteConfirmationValid(firstProject, firstProject.title)).toBe(
            true,
        )
        expect(
            isPhotographProjectDeleteConfirmationValid(
                firstProject,
                firstProject.title.toUpperCase(),
            ),
        ).toBe(false)
    })

    it('빈 대주제에 정확한 대소문자 제목을 입력한 경우만 삭제 확인으로 인정한다', () => {
        expect(isPhotographSectionDeleteConfirmationValid(sections[2], 'Empty')).toBe(true)
        expect(isPhotographSectionDeleteConfirmationValid(sections[2], 'empty')).toBe(false)
        expect(isPhotographSectionDeleteConfirmationValid(sections[0], 'Editorial')).toBe(false)
    })

    it('대주제 탭의 좌우·Home·End 키 이동을 순환 처리한다', () => {
        const sectionIds = sections.map((section) => section.id)

        expect(findKeyboardTargetId('ArrowRight', sectionIds, 'editorial')).toBe('cover')
        expect(findKeyboardTargetId('ArrowLeft', sectionIds, 'editorial')).toBe('empty')
        expect(findKeyboardTargetId('Home', sectionIds, 'cover')).toBe('editorial')
        expect(findKeyboardTargetId('End', sectionIds, 'cover')).toBe('empty')
        expect(findKeyboardTargetId('ArrowDown', sectionIds, 'cover')).toBeNull()
    })
})

function createProject(id: string): PhotographProjectMetadata {
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
                alt: id,
                width: 100,
                height: 120,
            },
        ],
    }
}
