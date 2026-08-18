/**
 * 보호된 Pages Function에서 공통으로 사용하는 관리자 인증 모듈.
 *
 * Authorization 헤더의 Firebase Bearer ID 토큰으로 실제 사용자를 조회하고,
 * 해당 이메일이 `ALLOWED_ADMIN_EMAILS`에 포함되어 있는지 확인한다. 예상 가능한
 * 인증 실패는 성공/실패를 구분한 결과로 돌려주므로 각 API handler는
 * `if (!auth.allowed) return auth.response` 패턴으로 동일한 오류 응답을 반환한다.
 */
import { isLocalAdminHostname, LOCAL_ADMIN_TOKEN } from '../../lib/auth/local-admin'

const FIREBASE_LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup'

interface FirebaseLookupResponse {
    users?: Array<{ localId: string; email?: string }>
    error?: { message: string }
}

/** 쉼표 구분 allowlist를 공백 없는 소문자 이메일 배열로 변환한다. */
function parseAllowedEmails(v: string | undefined): string[] {
    if (!v || typeof v !== 'string') return []
    return v
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
}

/**
 * 요청의 Firebase ID 토큰과 관리자 이메일을 검증한다.
 *
 * 실패 결과에 담기는 상태 코드는 다음과 같다.
 * - 401: Bearer 토큰 누락 또는 Firebase가 거부한 토큰
 * - 403: 관리자 allowlist 미설정 또는 목록에 없는 이메일
 * - 500: Firebase API key 미설정
 */
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

    const requestHostname = new URL(request.url).hostname
    if (token === LOCAL_ADMIN_TOKEN && isLocalAdminHostname(requestHostname)) {
        return { allowed: true }
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
