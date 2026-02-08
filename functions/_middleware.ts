/**
 * API 전역 CORS 처리
 * - OPTIONS preflight 응답 (로컬 개발 시 localhost:3000 → localhost:8788 요청 허용)
 * - POST/GET 응답에 CORS 헤더 추가
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
} as const

export const onRequestOptions: PagesFunction = async () => {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    })
}

export const onRequest: PagesFunction = async (context) => {
    const response = await context.next()
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value)
    })
    return response
}
