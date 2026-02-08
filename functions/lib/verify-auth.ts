/**
 * Request에서 Bearer ID 토큰 검증 후 허용 여부 반환.
 * 401 응답이 필요하면 반환값의 response를 그대로 반환하면 됨.
 */
const FIREBASE_LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup'

interface FirebaseLookupResponse {
    users?: Array<{ localId: string; email?: string }>
    error?: { message: string }
}

function parseAllowedEmails(v: string | undefined): string[] {
    if (!v || typeof v !== 'string') return []
    return v
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
}

export async function verifyBearerToken(
    request: Request,
    env: Env,
): Promise<{ allowed: true } | { allowed: false; response: Response }> {
    const auth = request.headers.get('Authorization')
    const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null
    if (!token) {
        return {
            allowed: false,
            response: Response.json({ error: 'Authorization required' }, { status: 401 }),
        }
    }

    const apiKey = env.FIREBASE_API_KEY
    const allowedEmails = parseAllowedEmails(env.ALLOWED_ADMIN_EMAILS)
    if (!apiKey) {
        return {
            allowed: false,
            response: Response.json({ error: 'Server configuration error' }, { status: 500 }),
        }
    }
    if (allowedEmails.length === 0) {
        return {
            allowed: false,
            response: Response.json({ error: 'No allowed admins configured' }, { status: 403 }),
        }
    }

    const lookupRes = await fetch(`${FIREBASE_LOOKUP_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
    })
    const data = (await lookupRes.json()) as FirebaseLookupResponse

    if (!lookupRes.ok || data.error) {
        return {
            allowed: false,
            response: Response.json(
                { error: data.error?.message ?? 'Invalid token' },
                { status: 401 },
            ),
        }
    }

    const email = (data.users?.[0]?.email ?? '').toLowerCase()
    if (!allowedEmails.includes(email)) {
        return {
            allowed: false,
            response: Response.json({ error: 'Not allowed' }, { status: 403 }),
        }
    }

    return { allowed: true }
}
