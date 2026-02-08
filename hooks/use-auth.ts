'use client'

import { useState, useEffect, useCallback } from 'react'
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, type User } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/auth/firebase'

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
    if (typeof window !== 'undefined') {
        const base = process.env.NEXT_PUBLIC_API_BASE ?? window.location.origin
        // Production: if env points to localhost but we're not on localhost, use current origin
        if (base.includes('localhost') && !window.location.hostname.includes('localhost')) {
            return window.location.origin
        }
        return base
    }
    return process.env.NEXT_PUBLIC_API_BASE ?? ''
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
    user: User | null
    isLoading: boolean
    isAllowed: boolean
    error: string | null
    signInWithGoogle: () => Promise<void>
    signOut: () => Promise<void>
    clearError: () => void
}

/**
 * Firebase Auth + Admin 허용 검증 통합 훅.
 * - Google 로그인, 로그아웃
 * - POST /api/auth/callback으로 토큰 검증 및 허용 여부 확인
 *
 * @see functions/docs/pages-functions-setup.md
 */
export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isAllowed, setIsAllowed] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const clearError = useCallback(() => setError(null), [])

    // Firebase Auth 상태 + 토큰 검증
    useEffect(() => {
        const auth = getFirebaseAuth()
        if (!auth) {
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

    const signInWithGoogle = useCallback(async () => {
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
    }, [])

    const signOut = useCallback(async () => {
        const auth = getFirebaseAuth()
        if (auth) {
            await firebaseSignOut(auth)
        }
        setUser(null)
        setIsAllowed(false)
        setError(null)
    }, [])

    return {
        user,
        isLoading,
        isAllowed,
        error,
        signInWithGoogle,
        signOut,
        clearError,
    }
}
