'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ExternalLink, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth, type AdminAuthUser } from '@/hooks/use-auth'
import { AdminManagementLayout } from '../components/admin-management-layout'
import { PhotographsManagementShell } from './components/photographs-management-shell'
import { usePhotographsManagement } from './hooks/use-photographs-management'

export default function PhotographManagementPage() {
    const router = useRouter()
    const { user, isLoading: isAuthLoading, isAllowed, signOut } = useAuth()

    useEffect(() => {
        if (!isAuthLoading && (!user || !isAllowed)) router.replace('/admin')
    }, [isAuthLoading, user, isAllowed, router])

    const headerAction = <PhotographManagementHeaderActions onSignOut={signOut} />

    if (isAuthLoading || !user || !isAllowed) {
        return (
            <AdminManagementLayout headerAction={user && isAllowed ? headerAction : undefined}>
                <PhotographManagementLoading />
            </AdminManagementLayout>
        )
    }

    return (
        <AdminManagementLayout headerAction={headerAction}>
            <PhotographManagementWorkspace getIdToken={() => user.getIdToken()} />
        </AdminManagementLayout>
    )
}

function PhotographManagementWorkspace({
    getIdToken,
}: {
    getIdToken: AdminAuthUser['getIdToken']
}) {
    const {
        loadState,
        sectionNavigation,
        projectNavigation,
        projectEditor,
        changeActions,
        navigationGuard,
        workspaceStatus,
        sectionCommands,
        projectCommands,
        assetCommands,
    } = usePhotographsManagement(getIdToken)

    if (loadState.kind === 'loading') return <PhotographManagementLoading />

    if (loadState.kind === 'error') {
        return <PhotographManagementError message={loadState.message} onRetry={loadState.onRetry} />
    }

    return (
        <PhotographsManagementShell
            sectionNavigation={sectionNavigation}
            projectNavigation={projectNavigation}
            projectEditor={projectEditor}
            changeActions={changeActions}
            navigationGuard={navigationGuard}
            workspaceStatus={workspaceStatus}
            sectionCommands={sectionCommands}
            projectCommands={projectCommands}
            assetCommands={assetCommands}
        />
    )
}

function PhotographManagementHeaderActions({ onSignOut }: { onSignOut: () => Promise<void> }) {
    return (
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/photographs" target="_blank">
                    공개 화면 <ExternalLink aria-hidden="true" />
                </Link>
            </Button>
            <Button variant="outline" onClick={onSignOut}>
                로그아웃 <LogOut aria-hidden="true" />
            </Button>
        </div>
    )
}

function PhotographManagementLoading() {
    return (
        <div className="animate-pulse overflow-hidden rounded-xl border bg-card shadow">
            <div className="space-y-3 border-b p-6">
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-8 w-64 rounded bg-muted" />
                <div className="h-4 w-96 max-w-full rounded bg-muted" />
            </div>
            <div className="space-y-8 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="h-10 rounded bg-muted" />
                    <div className="h-10 rounded bg-muted" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {Array.from({ length: 12 }, (_, index) => (
                        <div key={index} className="aspect-[4/5] rounded-lg bg-muted" />
                    ))}
                </div>
            </div>
        </div>
    )
}

function PhotographManagementError({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-8 text-center">
            <p className="text-sm font-medium text-destructive" role="alert">
                {message}
            </p>
            <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
                다시 불러오기
            </Button>
        </div>
    )
}
