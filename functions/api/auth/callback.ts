/**
 * 로그인 직후 클라이언트가 관리자 허용 여부를 확인하는 API.
 *
 * - Route: POST /api/auth/callback
 * - Body: { idToken: string }
 * - Success: { allowed: boolean, email?: string, uid?: string }
 * - Error: { error: string }
 *
 * Firebase Identity Toolkit의 accounts:lookup으로 ID 토큰과 사용자를 확인한 뒤,
 * 사용자 이메일을 `ALLOWED_ADMIN_EMAILS`의 쉼표 구분 목록과 대소문자 구분 없이
 * 비교한다. 유효한 사용자지만 허용 목록에 없으면 HTTP 200과 `allowed: false`를
 * 반환하며, Firebase 사용자 조회가 실패하면 401을 반환한다.
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

/** 환경 변수의 쉼표 구분 이메일을 비교 가능한 소문자 배열로 정규화한다. */
function parseAllowedEmails(v: string | undefined): string[] {
    if (!v || typeof v !== 'string') return []
    return v
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
}

/** Firebase 사용자 조회와 관리자 이메일 allowlist 확인을 순서대로 수행한다. */
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
