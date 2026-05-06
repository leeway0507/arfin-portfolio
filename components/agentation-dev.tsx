'use client'

import { useEffect, useState, type ComponentType } from 'react'
import type { AgentationProps } from 'agentation'

const AGENTATION_PREVIEW_PORT = '8788'

function shouldEnableAgentation(): boolean {
    if (process.env.NODE_ENV === 'development') return true
    if (typeof window === 'undefined') return false
    return window.location.port === AGENTATION_PREVIEW_PORT
}

/** Loads agentation locally (next dev / preview port 8788); avoids loading on real deploys. */
export function AgentationDev(props: Partial<AgentationProps> = {}) {
    const [Tool, setTool] = useState<ComponentType<Partial<AgentationProps>> | null>(null)

    useEffect(() => {
        if (!shouldEnableAgentation()) return

        let cancelled = false

        import('agentation').then(({ Agentation }) => {
            if (!cancelled) setTool(() => Agentation)
        })

        return () => {
            cancelled = true
        }
    }, [])

    if (!Tool) return null

    return <Tool {...props} />
}
