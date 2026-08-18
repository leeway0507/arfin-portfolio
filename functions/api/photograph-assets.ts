import {
    parsePhotographAssetUploadForm,
    storePhotographAssets,
} from '../lib/photograph-asset-upload'
import {
    parsePhotographAssetManagementUpdate,
    storePhotographAssetManagementUpdate,
} from '../lib/photograph-asset-manage'
import { verifyBearerToken } from '../lib/verify-auth'

const MAX_MULTIPART_REQUEST_BYTES = 24 * 1024 * 1024

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

    const parsedUpload = await parsePhotographAssetUploadForm(formData)
    if (!parsedUpload.ok) {
        return Response.json({ error: parsedUpload.error }, { status: parsedUpload.status })
    }

    try {
        const env = context.env as Env
        const result = await storePhotographAssets(
            env.PORTFOLIO,
            env,
            expectedEtag,
            parsedUpload.upload,
        )
        if (!result.ok) {
            return Response.json({ error: result.error }, { status: result.status })
        }

        return Response.json(
            { project: result.project },
            {
                status: result.status,
                headers: {
                    ETag: result.httpEtag,
                    'Cache-Control': 'no-store',
                },
            },
        )
    } catch (error) {
        console.error('Photographs 이미지 업로드 실패:', error)
        return Response.json(
            { error: 'Photographs 이미지를 업로드하지 못했습니다.' },
            { status: 500 },
        )
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

    const update = parsePhotographAssetManagementUpdate(body)
    if (!update) {
        return Response.json(
            { error: '이미지 관리 요청 형식이 올바르지 않습니다.' },
            { status: 400 },
        )
    }

    try {
        const env = context.env as Env
        const result = await storePhotographAssetManagementUpdate(
            env.PORTFOLIO,
            env,
            expectedEtag,
            update,
        )
        if (!result.ok) {
            return Response.json({ error: result.error }, { status: result.status })
        }

        return Response.json(
            { project: result.project, assetCleanup: result.assetCleanup },
            {
                status: result.status,
                headers: {
                    ETag: result.httpEtag,
                    'Cache-Control': 'no-store',
                },
            },
        )
    } catch (error) {
        console.error('Photographs 이미지 관리 실패:', error)
        return Response.json(
            { error: 'Photographs 이미지를 관리하지 못했습니다.' },
            { status: 500 },
        )
    }
}
