'use client'

import { type ReactNode } from 'react'

type EmptyStateViewProps = {
    message: string
    subMessage?: string
    action: ReactNode
}

export function EmptyStateView({ message, subMessage, action }: EmptyStateViewProps) {
    return (
        <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="mb-2 text-muted-foreground">{message}</p>
            {subMessage && <p className="mb-4 text-sm text-muted-foreground">{subMessage}</p>}
            {action}
        </div>
    )
}
