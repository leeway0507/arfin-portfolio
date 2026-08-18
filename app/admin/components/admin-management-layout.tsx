'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type AdminManagementLayoutProps = {
    children: ReactNode
    headerAction?: ReactNode
    centerContent?: ReactNode
}

const ADMIN_TABS = [
    { href: '/admin/home', label: '홈 관리' },
    { href: '/admin/photographs', label: '사진관리' },
] as const

export function AdminManagementLayout({
    children,
    headerAction,
    centerContent,
}: AdminManagementLayoutProps) {
    const pathname = usePathname()

    return (
        <div className="mx-auto max-w-[1920px] p-8 pt-16">
            <div className="mb-8 flex items-center justify-between gap-4">
                <div className="flex-1 flex justify-start">
                    <nav
                        className="inline-flex rounded-lg border bg-background p-1"
                        aria-label="관리 메뉴"
                    >
                        {ADMIN_TABS.map((tab) => {
                            const active = pathname === tab.href
                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className={cn(
                                        'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors',
                                        active && 'bg-primary text-primary-foreground shadow-sm',
                                    )}
                                >
                                    {tab.label}
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                {centerContent && <div className="flex-shrink-0">{centerContent}</div>}

                <div className="flex-1 flex justify-end">{headerAction}</div>
            </div>
            {children}
        </div>
    )
}
