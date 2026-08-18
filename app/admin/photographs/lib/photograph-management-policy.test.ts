import { getPhotographManagementPolicy } from './photograph-management-policy'

describe('photograph management policy', () => {
    const baseInput = {
        hasProjectChanges: false,
        hasProjectOrderChanges: false,
        hasSectionOrderChanges: false,
        isDraftValid: true,
        projectCount: 2,
        sectionCount: 2,
        operation: { kind: 'idle' } as const,
        isConflict: false,
    }

    test('변경이 없고 작업 중이 아니면 탐색과 편집을 허용한다', () => {
        expect(getPhotographManagementPolicy(baseInput)).toEqual({
            changeState: { kind: 'clean', mode: null },
            capabilities: {
                canNavigate: true,
                canEditProject: true,
                canReorderProjects: true,
                canReorderSections: true,
                canSaveChanges: false,
                canResetChanges: false,
            },
        })
    })

    test('프로젝트 초안 변경 중에는 편집만 계속 허용한다', () => {
        const policy = getPhotographManagementPolicy({
            ...baseInput,
            hasProjectChanges: true,
        })

        expect(policy.changeState).toEqual({ kind: 'project', mode: 'project' })
        expect(policy.capabilities).toMatchObject({
            canNavigate: false,
            canEditProject: true,
            canReorderProjects: false,
            canReorderSections: false,
            canSaveChanges: true,
            canResetChanges: true,
        })
    })

    test.each([
        ['hasProjectChanges', { kind: 'project', mode: 'project' }],
        ['hasProjectOrderChanges', { kind: 'project-order', mode: 'project-order' }],
        ['hasSectionOrderChanges', { kind: 'section-order', mode: 'section-order' }],
    ] as const)('%s 단일 변경을 저장 가능한 상태로 구분한다', (dirtyKey, expectedState) => {
        const policy = getPhotographManagementPolicy({
            ...baseInput,
            [dirtyKey]: true,
        })

        expect(policy.changeState).toEqual(expectedState)
    })

    test('서로 다른 변경이 겹치면 저장할 수 없는 상태로 표현한다', () => {
        const policy = getPhotographManagementPolicy({
            ...baseInput,
            hasProjectChanges: true,
            hasProjectOrderChanges: true,
        })

        expect(policy.changeState).toEqual({ kind: 'invalid-concurrent', mode: null })
        expect(policy.capabilities.canSaveChanges).toBe(false)
        expect(policy.capabilities.canResetChanges).toBe(false)
    })

    test('진행 중 작업은 모든 쓰기와 탐색을 잠근다', () => {
        const policy = getPhotographManagementPolicy({
            ...baseInput,
            hasProjectChanges: true,
            operation: { kind: 'deleting-project' },
        })

        expect(policy.capabilities).toMatchObject({
            canNavigate: false,
            canEditProject: false,
            canSaveChanges: false,
            canResetChanges: false,
        })
    })

    test('유효하지 않은 프로젝트 초안은 저장하지 못한다', () => {
        const policy = getPhotographManagementPolicy({
            ...baseInput,
            hasProjectChanges: true,
            isDraftValid: false,
        })

        expect(policy.capabilities.canSaveChanges).toBe(false)
        expect(policy.capabilities.canResetChanges).toBe(true)
    })
})
