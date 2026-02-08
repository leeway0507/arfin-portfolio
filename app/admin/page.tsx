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

type PageProps = { params: Promise<Record<string, string>> }

export default function AdminLoginPage(props: PageProps) {
    use(props.params)
    const router = useRouter()
    const { user, isLoading, isAllowed, error, signInWithGoogle, signOut, clearError } = useAuth()

    // AC5: 이미 로그인된 사용자 → 사진 관리 화면으로 바로 이동
    useEffect(() => {
        if (!isLoading && user && isAllowed) {
            router.replace('/admin/photos')
        }
    }, [isLoading, user, isAllowed, router])

    const handleGoogleLogin = () => {
        clearError()
        signInWithGoogle()
    }

    // AC1: Loading State - 인증 확인 중
    if (isLoading) {
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

    // AC5: 이미 로그인된 허용 사용자 → 리다이렉트 (useEffect에서 처리, 잠깐 보일 수 있음)
    if (user && isAllowed) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4 pt-20">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div
                            className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
                            aria-label="이동 중"
                        />
                        <p className="mt-4 text-sm text-muted-foreground">
                            사진 관리 화면으로 이동합니다...
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // AC1: Empty State - 로그인 전 기본 화면
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 pt-20">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold">Admin에 로그인하세요</CardTitle>
                    <CardDescription>포트폴리오 관리를 위해 로그인이 필요합니다.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-8">
                    {/* AC4: 허용되지 않은 계정 시도 시 에러 메시지 */}
                    {user && !isAllowed && (
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
                                onClick={() => signOut()}
                            >
                                다른 계정으로 시도
                            </Button>
                        </div>
                    )}
                    {/* Error State: 인증 실패, 네트워크 오류 */}
                    {error && (
                        <div
                            className="mb-4 w-full rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-center"
                            role="alert"
                        >
                            <p className="text-sm font-medium text-destructive">{error}</p>
                        </div>
                    )}
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
                        >
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </div>
                    <p className="text-center text-sm text-muted-foreground">
                        허용된 Google 계정으로만 접근 가능합니다.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={handleGoogleLogin} disabled={isLoading}>
                        {isLoading ? '로그인 중...' : 'Google로 로그인'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
