'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { type AdminLoginMode } from '@/lib/auth/local-admin'

type PageProps = { params: Promise<Record<string, string>> }

interface AdminLoginCardProps {
    loginMode: AdminLoginMode
    hasUnauthorizedUser: boolean
    error: string | null
    onLogin: () => void
    onTryDifferentAccount: () => void
}

export default function AdminLoginPage(props: PageProps) {
    use(props.params)
    const router = useRouter()
    const { user, isLoading, isAllowed, error, loginMode, signIn, signOut, clearError } = useAuth()

    useEffect(() => {
        if (!isLoading && user && isAllowed) router.replace('/admin/photographs')
    }, [isLoading, user, isAllowed, router])

    const handleLogin = () => {
        clearError()
        void signIn()
    }

    const handleTryDifferentAccount = () => {
        void signOut()
    }

    if (isLoading) return <AdminLoginChecking />
    if (user && isAllowed) return <AdminLoginRedirecting />

    return (
        <AdminLoginCard
            loginMode={loginMode}
            hasUnauthorizedUser={Boolean(user && !isAllowed)}
            error={error}
            onLogin={handleLogin}
            onTryDifferentAccount={handleTryDifferentAccount}
        />
    )
}

function AdminLoginChecking() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 pt-20">
            <Card className="w-full max-w-md">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <div
                        className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
                        aria-label="로그인 확인 중"
                    />
                    <p className="mt-4 text-sm text-muted-foreground">로그인 확인 중...</p>
                </CardContent>
            </Card>
        </div>
    )
}

function AdminLoginRedirecting() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 pt-20">
            <Card className="w-full max-w-md">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <div
                        className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
                        aria-label="이동 중"
                    />
                    <p className="mt-4 text-sm text-muted-foreground">
                        사진관리 화면으로 이동합니다...
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}

function AdminLoginCard({
    loginMode,
    hasUnauthorizedUser,
    error,
    onLogin,
    onTryDifferentAccount,
}: AdminLoginCardProps) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 pt-20">
            <Card className="w-full max-w-md">
                <AdminLoginCardHeader />
                <AdminLoginCardContent
                    loginMode={loginMode}
                    hasUnauthorizedUser={hasUnauthorizedUser}
                    error={error}
                    onTryDifferentAccount={onTryDifferentAccount}
                />
                <AdminLoginCardActions loginMode={loginMode} onLogin={onLogin} />
            </Card>
        </div>
    )
}

function AdminLoginCardHeader() {
    return (
        <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Admin에 로그인하세요</CardTitle>
            <CardDescription>포트폴리오 관리를 위해 로그인이 필요합니다.</CardDescription>
        </CardHeader>
    )
}

function AdminLoginCardContent({
    loginMode,
    hasUnauthorizedUser,
    error,
    onTryDifferentAccount,
}: Pick<
    AdminLoginCardProps,
    'loginMode' | 'hasUnauthorizedUser' | 'error' | 'onTryDifferentAccount'
>) {
    return (
        <CardContent className="flex flex-col items-center justify-center py-8">
            {hasUnauthorizedUser && (
                <AdminLoginAccessError onTryDifferentAccount={onTryDifferentAccount} />
            )}
            {error && <AdminLoginErrorMessage error={error} />}
            <AdminLoginLockIcon />
            <p className="text-center text-sm text-muted-foreground">
                {loginMode === 'google'
                    ? '허용된 Google 계정으로만 접근 가능합니다.'
                    : '관리자 인증 후 접근할 수 있습니다.'}
            </p>
        </CardContent>
    )
}

function AdminLoginAccessError({
    onTryDifferentAccount,
}: Pick<AdminLoginCardProps, 'onTryDifferentAccount'>) {
    return (
        <div
            className="mb-4 w-full rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-center"
            role="alert"
        >
            <p className="text-sm font-medium text-destructive">
                이 계정은 Admin 접근 권한이 없습니다.
            </p>
            <Button
                variant="link"
                className="mt-2 text-destructive"
                onClick={onTryDifferentAccount}
            >
                다른 계정으로 시도
            </Button>
        </div>
    )
}

function AdminLoginErrorMessage({ error }: Pick<AdminLoginCardProps, 'error'>) {
    return (
        <div
            className="mb-4 w-full rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-center"
            role="alert"
        >
            <p className="text-sm font-medium text-destructive">{error}</p>
        </div>
    )
}

function AdminLoginLockIcon() {
    return (
        <div className="mb-4 rounded-full bg-muted p-6">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-12 w-12 text-muted-foreground"
                aria-hidden="true"
            >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
        </div>
    )
}

function AdminLoginCardActions({
    loginMode,
    onLogin,
}: Pick<AdminLoginCardProps, 'loginMode' | 'onLogin'>) {
    return (
        <CardFooter>
            <Button className="w-full" onClick={onLogin}>
                {loginMode === 'google' ? 'Google로 로그인' : '로그인'}
            </Button>
        </CardFooter>
    )
}
