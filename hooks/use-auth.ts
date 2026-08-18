'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged,
} from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/auth/firebase'
import {
    getAdminLoginMode,
    LOCAL_ADMIN_SESSION_KEY,
    LOCAL_ADMIN_TOKEN,
    type AdminLoginMode,
} from '@/lib/auth/local-admin'

/**
 * POST /api/auth/callback 응답 타입
 * @see functions/docs/pages-functions-setup.md
 */
interface AuthCallbackSuccess {
    allowed: boolean
    email?: string
    uid?: string
}

interface AuthCallbackError {
    error: string
}

type AuthCallbackResult = AuthCallbackSuccess | AuthCallbackError

function isAuthCallbackError(res: AuthCallbackResult): res is AuthCallbackError {
    return 'error' in res && typeof (res as AuthCallbackError).error === 'string'
}

function getApiBase(): string {
    const configuredBase = process.env.NEXT_PUBLIC_API_BASE?.trim()
    if (typeof window !== 'undefined') {
        const base = configuredBase || window.location.origin
        // Production: if env points to localhost but we're not on localhost, use current origin
        if (base.includes('localhost') && !window.location.hostname.includes('localhost')) {
            return window.location.origin
        }
        return base
    }
    return configuredBase || ''
}

async function verifyToken(idToken: string): Promise<AuthCallbackSuccess | null> {
    const apiBase = getApiBase()
    if (!apiBase) return null

    const res = await fetch(`${apiBase}/api/auth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
    })
    const data = (await res.json()) as AuthCallbackResult

    if (!res.ok) {
        throw new Error(isAuthCallbackError(data) ? data.error : `Request failed: ${res.status}`)
    }
    if (isAuthCallbackError(data)) {
        throw new Error(data.error)
    }
    return data
}

export interface UseAuthReturn {
    user: AdminAuthUser | null
    isLoading: boolean
    isAllowed: boolean
    error: string | null
    loginMode: AdminLoginMode
    signIn: () => Promise<void>
    signOut: () => Promise<void>
    clearError: () => void
}

export interface AdminAuthUser {
    getIdToken: () => Promise<string>
}

/**
 * Firebase Auth + Admin 허용 검증 통합 훅.
 * - Google 로그인, 로그아웃
 * - POST /api/auth/callback으로 토큰 검증 및 허용 여부 확인
 *
 * @see functions/docs/pages-functions-setup.md
 */
export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<AdminAuthUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isAllowed, setIsAllowed] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loginMode, setLoginMode] = useState<AdminLoginMode>('google')

    const clearError = useCallback(() => setError(null), [])

    // 로컬 직접 로그인과 운영 Google 로그인이 Firebase 상태를 공유하지 않도록 분리한다.
    useEffect(() => {
        const currentLoginMode = getCurrentAdminLoginMode()
        setLoginMode(currentLoginMode)

        if (currentLoginMode === 'local') {
            const hasLocalSession = isLocalAdminSessionActive()
            setUser(hasLocalSession ? createLocalAdminUser() : null)
            setIsAllowed(hasLocalSession)
            setIsLoading(false)
            return
        }

        const auth = getFirebaseAuth()
        if (!auth) {
            setError('Firebase가 설정되지 않았습니다.')
            setIsLoading(false)
            return
        }

        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) {
                setUser(null)
                setIsAllowed(false)
                setIsLoading(false)
                return
            }
            setUser(firebaseUser)
            setIsLoading(true)
            try {
                const token = await firebaseUser.getIdToken()
                const result = await verifyToken(token)
                setIsAllowed(result?.allowed ?? false)
            } catch (e) {
                setError(e instanceof Error ? e.message : '인증 확인 실패')
                setIsAllowed(false)
            } finally {
                setIsLoading(false)
            }
        })

        return () => unsub()
    }, [])

    const signIn = useCallback(async () => {
        if (loginMode === 'local') {
            localStorage.setItem(LOCAL_ADMIN_SESSION_KEY, 'active')
            setError(null)
            setUser(createLocalAdminUser())
            setIsAllowed(true)
            setIsLoading(false)
            return
        }

        const auth = getFirebaseAuth()
        if (!auth) {
            setError('Firebase가 설정되지 않았습니다.')
            return
        }
        const apiBase = getApiBase()
        if (!apiBase) {
            setError('NEXT_PUBLIC_API_BASE가 설정되지 않았습니다.')
            return
        }
        setError(null)
        setIsLoading(true)
        try {
            await signInWithPopup(auth, new GoogleAuthProvider())
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Google 로그인 실패')
        } finally {
            setIsLoading(false)
        }
    }, [loginMode])

    const signOut = useCallback(async () => {
        if (loginMode === 'local') {
            localStorage.removeItem(LOCAL_ADMIN_SESSION_KEY)
            setUser(null)
            setIsAllowed(false)
            setError(null)
            return
        }

        const auth = getFirebaseAuth()
        if (auth) await firebaseSignOut(auth)
        setUser(null)
        setIsAllowed(false)
        setError(null)
    }, [loginMode])

    return {
        user,
        isLoading,
        isAllowed,
        error,
        loginMode,
        signIn,
        signOut,
        clearError,
    }
}

function getCurrentAdminLoginMode(): AdminLoginMode {
    if (typeof window === 'undefined') return 'google'
    return getAdminLoginMode(window.location.hostname)
}

function isLocalAdminSessionActive(): boolean {
    return localStorage.getItem(LOCAL_ADMIN_SESSION_KEY) === 'active'
}

function createLocalAdminUser(): AdminAuthUser {
    return {
        getIdToken: () => Promise.resolve(LOCAL_ADMIN_TOKEN),
    }
}
