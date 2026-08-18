import type { PhotographManagementChangeMode } from '../types'
import {
    isPhotographManagementOperationActive,
    type PhotographManagementOperation,
} from './photograph-management-operation'

interface PhotographManagementPolicyInput {
    hasProjectChanges: boolean
    hasProjectOrderChanges: boolean
    hasSectionOrderChanges: boolean
    isDraftValid: boolean
    projectCount: number
    sectionCount: number
    operation: PhotographManagementOperation
    isConflict: boolean
}

export type PhotographManagementChangeState =
    | { kind: 'clean'; mode: null }
    | { kind: 'project'; mode: 'project' }
    | { kind: 'project-order'; mode: 'project-order' }
    | { kind: 'section-order'; mode: 'section-order' }
    | { kind: 'invalid-concurrent'; mode: null }

export interface PhotographManagementCapabilities {
    canNavigate: boolean
    canEditProject: boolean
    canReorderProjects: boolean
    canReorderSections: boolean
    canSaveChanges: boolean
    canResetChanges: boolean
}

export interface PhotographManagementPolicy {
    changeState: PhotographManagementChangeState
    capabilities: PhotographManagementCapabilities
}

export function getPhotographManagementPolicy({
    hasProjectChanges,
    hasProjectOrderChanges,
    hasSectionOrderChanges,
    isDraftValid,
    projectCount,
    sectionCount,
    operation,
    isConflict,
}: PhotographManagementPolicyInput): PhotographManagementPolicy {
    const changeState = getPhotographManagementChangeState({
        hasProjectChanges,
        hasProjectOrderChanges,
        hasSectionOrderChanges,
    })
    const hasChanges = changeState.kind !== 'clean'
    const isOperationActive = isPhotographManagementOperationActive(operation)

    return {
        changeState,
        capabilities: {
            canNavigate: !hasChanges && !isOperationActive && !isConflict,
            canEditProject:
                !hasProjectOrderChanges &&
                !hasSectionOrderChanges &&
                !isOperationActive &&
                !isConflict,
            canReorderProjects:
                projectCount >= 2 &&
                !hasProjectChanges &&
                !hasSectionOrderChanges &&
                !isOperationActive &&
                !isConflict,
            canReorderSections:
                sectionCount >= 2 &&
                !hasProjectChanges &&
                !hasProjectOrderChanges &&
                !isOperationActive &&
                !isConflict,
            canSaveChanges:
                isChangeStateSavable(changeState, isDraftValid) &&
                !isOperationActive &&
                !isConflict,
            canResetChanges:
                hasChanges && changeState.kind !== 'invalid-concurrent' && !isOperationActive,
        },
    }
}

function getPhotographManagementChangeState({
    hasProjectChanges,
    hasProjectOrderChanges,
    hasSectionOrderChanges,
}: Pick<
    PhotographManagementPolicyInput,
    'hasProjectChanges' | 'hasProjectOrderChanges' | 'hasSectionOrderChanges'
>): PhotographManagementChangeState {
    const activeModes = [
        hasProjectChanges ? 'project' : null,
        hasProjectOrderChanges ? 'project-order' : null,
        hasSectionOrderChanges ? 'section-order' : null,
    ].filter((mode): mode is Exclude<PhotographManagementChangeMode, null> => mode !== null)

    if (activeModes.length > 1) return { kind: 'invalid-concurrent', mode: null }
    if (activeModes.length === 0) return { kind: 'clean', mode: null }

    const mode = activeModes[0]
    if (mode === 'project') return { kind: 'project', mode: 'project' }
    if (mode === 'project-order') return { kind: 'project-order', mode: 'project-order' }
    return { kind: 'section-order', mode: 'section-order' }
}

function isChangeStateSavable(
    changeState: PhotographManagementChangeState,
    isDraftValid: boolean,
): boolean {
    if (changeState.kind === 'project') return isDraftValid
    return changeState.kind === 'project-order' || changeState.kind === 'section-order'
}
