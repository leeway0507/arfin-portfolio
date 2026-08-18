import type { PhotographManagementChangeMode } from '../types'

type SavablePhotographManagementChangeMode = Exclude<PhotographManagementChangeMode, null>

export type PhotographManagementOperation =
    | { kind: 'idle' }
    | { kind: 'saving-changes'; changeMode: SavablePhotographManagementChangeMode }
    | { kind: 'uploading-assets'; progress: string | null }
    | { kind: 'creating-project'; progress: string | null }
    | { kind: 'creating-section' }
    | { kind: 'renaming-section' }
    | { kind: 'deleting-section' }
    | { kind: 'deleting-project' }
    | { kind: 'managing-assets' }

export type PhotographManagementOperationKind = PhotographManagementOperation['kind']

export const IDLE_PHOTOGRAPH_MANAGEMENT_OPERATION: PhotographManagementOperation = {
    kind: 'idle',
}

export function isPhotographManagementOperationActive(
    operation: PhotographManagementOperation,
): boolean {
    return operation.kind !== 'idle'
}

export function isPhotographManagementOperation(
    operation: PhotographManagementOperation,
    ...kinds: PhotographManagementOperationKind[]
): boolean {
    return kinds.includes(operation.kind)
}

export function getPhotographManagementOperationProgress(
    operation: PhotographManagementOperation,
): string | null {
    if (operation.kind === 'uploading-assets' || operation.kind === 'creating-project') {
        return operation.progress
    }
    return null
}
