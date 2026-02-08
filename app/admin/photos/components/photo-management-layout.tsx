'use client'

import { type ReactNode } from 'react'

type PhotoManagementLayoutProps = {
    title: string
    children: ReactNode
    headerAction?: ReactNode
}

export function PhotoManagementLayout({
    title,
    children,
    headerAction,
}: PhotoManagementLayoutProps) {
    return (
        <div className="p-8 pt-20">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold">{title}</h1>
                {headerAction}
            </div>
            {children}
        </div>
    )
}
