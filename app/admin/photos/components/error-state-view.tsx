'use client'

import { Button } from '@/components/ui/button'

type ErrorStateViewProps = {
    message: string
    onRetry: () => void
}

export function ErrorStateView({ message, onRetry }: ErrorStateViewProps) {
    return (
        <div className="rounded-lg border border-dashed border-destructive/50 bg-destructive/5 p-12 text-center">
            <p className="mb-4 text-muted-foreground">{message}</p>
            <Button type="button" onClick={onRetry}>
                다시 시도
            </Button>
        </div>
    )
}
