import {
    getPhotographManagementOperationProgress,
    isPhotographManagementOperation,
    isPhotographManagementOperationActive,
    type PhotographManagementOperation,
} from './photograph-management-operation'

describe('photograph management operation', () => {
    test('idle일 때만 진행 중인 작업이 없다고 판단한다', () => {
        expect(isPhotographManagementOperationActive({ kind: 'idle' })).toBe(false)
        expect(
            isPhotographManagementOperationActive({
                kind: 'saving-changes',
                changeMode: 'project',
            }),
        ).toBe(true)
    })

    test('여러 행위를 하나의 역할 상태로 묶어 확인할 수 있다', () => {
        const operation: PhotographManagementOperation = { kind: 'deleting-section' }

        expect(
            isPhotographManagementOperation(
                operation,
                'creating-section',
                'renaming-section',
                'deleting-section',
            ),
        ).toBe(true)
        expect(isPhotographManagementOperation(operation, 'deleting-project')).toBe(false)
    })

    test('진행 문구는 이를 소유하는 작업에서만 얻는다', () => {
        expect(
            getPhotographManagementOperationProgress({
                kind: 'uploading-assets',
                progress: '업로드 중 2장',
            }),
        ).toBe('업로드 중 2장')
        expect(getPhotographManagementOperationProgress({ kind: 'managing-assets' })).toBeNull()
    })
})
