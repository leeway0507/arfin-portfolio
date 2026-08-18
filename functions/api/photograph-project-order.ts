import {
    parsePhotographProjectOrderUpdate,
    storePhotographProjectOrder,
} from '../lib/photograph-project-order'
import { verifyBearerToken } from '../lib/verify-auth'

export const onRequestPatch: PagesFunction<Env> = async (context) => {
    const auth = await verifyBearerToken(context.request, context.env as Env)
    if (!auth.allowed) return auth.response

    const expectedEtag = context.request.headers.get('If-Match')
    if (!expectedEtag) {
        return Response.json({ error: 'If-Match 헤더가 필요합니다.' }, { status: 428 })
    }

    let body: unknown
    try {
        body = await context.request.json()
    } catch {
        return Response.json({ error: 'JSON body가 필요합니다.' }, { status: 400 })
    }

    const orderUpdate = parsePhotographProjectOrderUpdate(body)
    if (!orderUpdate) {
        return Response.json(
            { error: '소주제 순서 변경값 형식이 올바르지 않습니다.' },
            { status: 400 },
        )
    }

    try {
        const env = context.env as Env
        const result = await storePhotographProjectOrder(
            env.PORTFOLIO,
            env,
            expectedEtag,
            orderUpdate,
        )
        if (!result.ok) {
            return Response.json({ error: result.error }, { status: result.status })
        }

        return Response.json(
            { section: result.section },
            {
                status: result.status,
                headers: {
                    ETag: result.httpEtag,
                    'Cache-Control': 'no-store',
                },
            },
        )
    } catch (error) {
        console.error('Photographs 소주제 순서 저장 실패:', error)
        return Response.json(
            { error: 'Photographs 소주제 순서를 저장하지 못했습니다.' },
            { status: 500 },
        )
    }
}
