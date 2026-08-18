/**
 * functions 아래의 모든 API 응답에 적용되는 CORS middleware.
 *
 * 로컬에서는 Next.js(localhost:3000)와 Pages Functions(localhost:8788)의 origin이
 * 달라 브라우저의 CORS 허용이 필요하다. OPTIONS preflight는 실제 handler까지
 * 보내지 않고 204로 끝내며, 일반 요청은 다음 handler의 응답에 같은 헤더를 붙인다.
 * 현재 Allow-Origin은 `*`이므로 배포 환경에서도 모든 origin의 요청을 허용한다.
 *
 * 이 파일은 출처 간 요청만 허용할 뿐 인증을 수행하지 않는다. 보호가 필요한
 * endpoint는 각 handler에서 verifyBearerToken을 별도로 호출해야 한다.
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, If-Match',
    'Access-Control-Expose-Headers': 'ETag',
    'Access-Control-Max-Age': '86400',
} as const

/** 브라우저의 사전 요청에 본문 없는 성공 응답을 보낸다. */
export const onRequestOptions: PagesFunction = async () => {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
    })
}

/** GET/POST/PATCH/DELETE handler가 만든 응답에 CORS 헤더를 추가한다. */
export const onRequest: PagesFunction = async (context) => {
    const response = await context.next()
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value)
    })
    return response
}
