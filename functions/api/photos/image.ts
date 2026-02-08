/**
 * GET /api/photos/image?filename=xxx - R2 이미지 프록시 (인증 없음)
 * CDN 경로 불일치·로컬 개발 시 이미지를 API로 직접 서빙
 */

import { getPrefix } from '../../lib/photos-r2'

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
