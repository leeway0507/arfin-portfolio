'use client'

import { useEffect, useState } from 'react'
import { getPhotographSections } from '@/lib/apis/photographs/api'
import type { PhotographSection } from '@/lib/apis/photographs/types'
import { getVisiblePhotographSections } from './lib/photographs-public-state'
import { PhotographsSections } from './photographs-sections'

export function PhotographsPageLoader() {
    const [sections, setSections] = useState<PhotographSection[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        getPhotographSections()
            .then(setSections)
            .catch((loadError) => {
                console.error('Photographs 목록 로드 실패:', loadError)
                setError('사진 목록을 불러오지 못했습니다.')
            })
    }, [])

    if (error) {
        return <PhotographsErrorState message={error} />
    }

    if (!sections) {
        return <PhotographsLoadingState />
    }

    const visibleSections = getVisiblePhotographSections(sections)
    if (visibleSections.length === 0) {
        return <PhotographsErrorState message="공개할 Photographs 프로젝트가 아직 없습니다." />
    }

    return <PhotographsSections sections={visibleSections} />
}

function PhotographsLoadingState() {
    return (
        <main className="flex min-h-dvh items-center justify-center" aria-busy="true">
            <h1 className="sr-only">Photographs</h1>
            <div
                className="h-7 w-7 animate-spin rounded-full border-2 border-black border-t-transparent"
                aria-label="사진을 불러오는 중"
            />
        </main>
    )
}

function PhotographsErrorState({ message }: { message: string }) {
    return (
        <main className="flex min-h-dvh items-center justify-center px-6 text-center">
            <h1 className="sr-only">Photographs</h1>
            <p className="text-sm text-black/60">{message}</p>
        </main>
    )
}
