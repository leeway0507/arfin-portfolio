/**
 * Auth Callback - Firebase ID 토큰 검증 및 허용 계정 확인
 *
 * POST /api/auth/callback
 * Body: { idToken: string }
 * Response: { allowed: boolean, email?: string, uid?: string } | { error: string }
 */

const FIREBASE_LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup'

interface FirebaseLookupResponse {
    users?: Array<{
        localId: string
        email?: string
        emailVerified?: boolean
        displayName?: string
    }>
    error?: {
        message: string
        code?: number
    }
}

interface CallbackRequest {
    idToken?: string
}

interface CallbackSuccessResponse {
    allowed: boolean
    email?: string
    uid?: string
}

interface CallbackErrorResponse {
    error: string
}

function parseAllowedEmails(v: string | undefined): string[] {
    if (!v || typeof v !== 'string') return []
    return v
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const env = context.env as Env
    const apiKey = env.FIREBASE_API_KEY
    const allowedEmails = parseAllowedEmails(env.ALLOWED_ADMIN_EMAILS)

    if (!apiKey) {
        return Response.json(
            { error: 'Server configuration error' } satisfies CallbackErrorResponse,
            { status: 500 },
        )
    }

    let body: CallbackRequest
    try {
        body = (await context.request.json()) as CallbackRequest
    } catch {
        return Response.json({ error: 'Invalid JSON body' } satisfies CallbackErrorResponse, {
            status: 400,
        })
    }

    const idToken = body?.idToken
    if (!idToken || typeof idToken !== 'string') {
        return Response.json({ error: 'idToken is required' } satisfies CallbackErrorResponse, {
            status: 400,
        })
    }

    const lookupRes = await fetch(`${FIREBASE_LOOKUP_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
    })

    const lookupData = (await lookupRes.json()) as FirebaseLookupResponse

    if (!lookupRes.ok || lookupData.error) {
        const msg = lookupData.error?.message ?? `Firebase lookup failed: ${lookupRes.status}`
        return Response.json({ error: msg } satisfies CallbackErrorResponse, { status: 401 })
    }

    const users = lookupData.users
    if (!users?.length) {
        return Response.json({ error: 'User not found' } satisfies CallbackErrorResponse, {
            status: 401,
        })
    }

    const user = users[0]
    const email = (user.email ?? '').toLowerCase()

    if (allowedEmails.length === 0) {
        return Response.json(
            { error: 'No allowed admins configured' } satisfies CallbackErrorResponse,
            { status: 403 },
        )
    }

    const allowed = allowedEmails.includes(email)

    return Response.json({
        allowed,
        email: user.email,
        uid: user.localId,
    } satisfies CallbackSuccessResponse)
}
