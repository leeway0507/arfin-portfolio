import {
    parsePhotographProjectCreateForm,
    storePhotographProjectCreation,
} from '../lib/photograph-project-create'
import {
    parsePhotographProjectDeletion,
    storePhotographProjectDeletion,
} from '../lib/photograph-project-delete'
import { verifyBearerToken } from '../lib/verify-auth'

const MAX_MULTIPART_REQUEST_BYTES = 3 * 1024 * 1024

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const auth = await verifyBearerToken(context.request, context.env as Env)
    if (!auth.allowed) return auth.response

    const expectedEtag = context.request.headers.get('If-Match')
    if (!expectedEtag) {
        return Response.json({ error: 'If-Match 헤더가 필요합니다.' }, { status: 428 })
    }

    const contentLength = Number(context.request.headers.get('Content-Length'))
    if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_REQUEST_BYTES) {
        return Response.json({ error: '업로드 요청이 너무 큽니다.' }, { status: 413 })
    }

    let formData: FormData
    try {
        formData = await context.request.formData()
    } catch {
        return Response.json({ error: 'multipart/form-data body가 필요합니다.' }, { status: 400 })
    }

    const parsedCreation = await parsePhotographProjectCreateForm(formData)
    if (!parsedCreation.ok) {
        return Response.json({ error: parsedCreation.error }, { status: parsedCreation.status })
    }

    try {
        const env = context.env as Env
        const result = await storePhotographProjectCreation(
            env.PORTFOLIO,
            env,
            expectedEtag,
            parsedCreation.creation,
        )
        if (!result.ok) {
            return Response.json({ error: result.error }, { status: result.status })
        }

        return Response.json(
            { section: result.section, project: result.project },
            {
                status: result.status,
                headers: {
                    ETag: result.httpEtag,
                    'Cache-Control': 'no-store',
                },
            },
        )
    } catch (error) {
        console.error('Photographs 소주제 생성 실패:', error)
        return Response.json({ error: 'Photographs 소주제를 만들지 못했습니다.' }, { status: 500 })
    }
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
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

    const deletion = parsePhotographProjectDeletion(body)
    if (!deletion) {
        return Response.json({ error: '삭제할 대·소주제 식별자가 필요합니다.' }, { status: 400 })
    }

    try {
        const env = context.env as Env
        const result = await storePhotographProjectDeletion(
            env.PORTFOLIO,
            env,
            expectedEtag,
            deletion,
        )
        if (!result.ok) {
            return Response.json({ error: result.error }, { status: result.status })
        }

        return Response.json(
            {
                section: result.section,
                deletedProjectId: result.deletedProjectId,
                assetCleanup: result.assetCleanup,
            },
            {
                status: result.status,
                headers: {
                    ETag: result.httpEtag,
                    'Cache-Control': 'no-store',
                },
            },
        )
    } catch (error) {
        console.error('Photographs 소주제 삭제 실패:', error)
        return Response.json(
            { error: 'Photographs 소주제를 삭제하지 못했습니다.' },
            { status: 500 },
        )
    }
}
