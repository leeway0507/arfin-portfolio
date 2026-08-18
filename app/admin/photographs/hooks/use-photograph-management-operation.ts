'use client'

import { useCallback, useRef, useState } from 'react'
import {
    IDLE_PHOTOGRAPH_MANAGEMENT_OPERATION,
    type PhotographManagementOperation,
} from '../lib/photograph-management-operation'

interface PhotographManagementOperationLease {
    finish: () => void
    updateProgress: (progress: string | null) => void
}

export function usePhotographManagementOperation() {
    const [operation, setOperation] = useState<PhotographManagementOperation>(
        IDLE_PHOTOGRAPH_MANAGEMENT_OPERATION,
    )
    const operationRef = useRef<PhotographManagementOperation>(IDLE_PHOTOGRAPH_MANAGEMENT_OPERATION)
    const operationTokenRef = useRef(0)

    const startOperation = useCallback(
        (
            nextOperation: Exclude<PhotographManagementOperation, { kind: 'idle' }>,
        ): PhotographManagementOperationLease | null => {
            if (operationRef.current.kind !== 'idle') return null

            const operationToken = operationTokenRef.current + 1
            operationTokenRef.current = operationToken
            operationRef.current = nextOperation
            setOperation(nextOperation)

            return {
                finish: () => {
                    if (operationTokenRef.current !== operationToken) return
                    operationRef.current = IDLE_PHOTOGRAPH_MANAGEMENT_OPERATION
                    setOperation(IDLE_PHOTOGRAPH_MANAGEMENT_OPERATION)
                },
                updateProgress: (progress) => {
                    if (operationTokenRef.current !== operationToken) return
                    const currentOperation = operationRef.current
                    if (
                        currentOperation.kind !== 'uploading-assets' &&
                        currentOperation.kind !== 'creating-project'
                    ) {
                        return
                    }

                    const nextProgressOperation = { ...currentOperation, progress }
                    operationRef.current = nextProgressOperation
                    setOperation(nextProgressOperation)
                },
            }
        },
        [],
    )

    return { operation, startOperation }
}
