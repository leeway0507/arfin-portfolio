import { getPhotographManifestSnapshot, putPhotographManifest } from '../lib/photographs-r2'
import {
    applyPhotographProjectUpdate,
    parsePhotographProjectUpdate,
} from '../lib/photograph-project-update'
import { verifyBearerToken } from '../lib/verify-auth'

export const onRequestGet: PagesFunction<Env> = async (context) => {
    try {
        const snapshot = await getPhotographManifestSnapshot(
            context.env.PORTFOLIO,
            context.env as Env,
        )

        if (!snapshot) {
            return Response.json({ error: 'Photographs manifest가 없습니다.' }, { status: 404 })
        }

        return Response.json(snapshot.manifest, {
            headers: {
                ETag: snapshot.httpEtag,
                'Cache-Control': 'no-cache',
            },
        })
    } catch (error) {
        console.error('Photographs manifest 조회 실패:', error)
        return Response.json({ error: 'Photographs 목록을 불러오지 못했습니다.' }, { status: 500 })
    }
}

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

    const updateRequest = parsePhotographProjectUpdate(body)
    if (!updateRequest) {
        return Response.json(
            { error: '프로젝트 수정값 형식이 올바르지 않습니다.' },
            { status: 400 },
        )
    }

    try {
        const env = context.env as Env
        const snapshot = await getPhotographManifestSnapshot(env.PORTFOLIO, env)
        if (!snapshot) {
            return Response.json({ error: 'Photographs manifest가 없습니다.' }, { status: 404 })
        }

        const updateResult = applyPhotographProjectUpdate(snapshot.manifest, updateRequest)
        if (!updateResult.ok) {
            return Response.json({ error: updateResult.error }, { status: updateResult.status })
        }

        const storedSnapshot = await putPhotographManifest(
            env.PORTFOLIO,
            env,
            updateResult.manifest,
            expectedEtag,
        )
        if (!storedSnapshot) {
            return Response.json(
                { error: '다른 곳에서 먼저 수정했습니다. 새로 불러온 뒤 다시 시도해 주세요.' },
                { status: 412 },
            )
        }

        return Response.json(
            { project: updateResult.project },
            {
                headers: {
                    ETag: storedSnapshot.httpEtag,
                    'Cache-Control': 'no-store',
                },
            },
        )
    } catch (error) {
        console.error('Photographs 프로젝트 저장 실패:', error)
        return Response.json(
            { error: 'Photographs 프로젝트를 저장하지 못했습니다.' },
            { status: 500 },
        )
    }
}
