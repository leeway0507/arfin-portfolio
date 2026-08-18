/**
 * R2 이미지를 직접 내려주는 공개 프록시 API.
 *
 * - Route: GET /api/photos/image?filename=...
 * - Auth: 없음
 * - Response: R2 객체의 stream과 Content-Type (없으면 404)
 *
 * 별도 이미지 CDN을 사용할 수 없는 로컬 개발 환경과 CDN 경로가 맞지 않는
 * 경우를 위한 경로다. 브라우저가 하루 동안 캐시하도록 Cache-Control을 설정한다.
 */

import { getPrefix } from '../../lib/photos-r2'

/** filename을 현재 prefix 아래의 R2 object key로 바꿔 이미지 본문을 스트리밍한다. */
export const onRequestGet: PagesFunction<Env> = async (context) => {
    const filename = context.request.url
        ? new URL(context.request.url).searchParams.get('filename')
        : null
    if (!filename || !filename.trim()) {
        return new Response('filename 쿼리가 필요합니다.', { status: 400 })
    }

    const env = context.env as Env
    const bucket = env.PORTFOLIO
    const prefix = getPrefix(env)
    const objectKey = prefix ? prefix + filename : filename

    console.log('hello')

    const obj = await bucket.get(objectKey)
    if (!obj?.body) {
        return new Response('Not Found', { status: 404 })
    }

    const headers = new Headers()
    const contentType = obj.httpMetadata?.contentType ?? 'image/webp'
    headers.set('Content-Type', contentType)
    headers.set('Cache-Control', 'public, max-age=86400')

    return new Response(obj.body, { headers })
}
