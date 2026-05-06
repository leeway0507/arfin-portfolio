/**
 * GET  /api/home - 공개 홈 대표 이미지 설정 조회
 * POST /api/home - 홈 대표 이미지 단일 업로드/교체 (인증 필요)
 */

import { verifyBearerToken } from '../../lib/verify-auth'
import { getHomeImageConfig, putHomeImage, updateHomeImageLayout } from '../../lib/home-r2'

const DEFAULT_HOME_ALT = 'Arfin Yoon main image'

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const env = context.env as Env
    const bucket = env.PORTFOLIO
    const config = await getHomeImageConfig(bucket, env)

    if (!config) {
        return Response.json({
            imageKey: null,
            alt: DEFAULT_HOME_ALT,
            updatedAt: null,
        })
    }

    return Response.json(config)
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const auth = await verifyBearerToken(context.request, context.env as Env)
    if (!auth.allowed) return auth.response

    let formData: FormData
    try {
        formData = await context.request.formData()
    } catch {
        return Response.json(
            { error: 'multipart/form-data를 파싱할 수 없습니다.' },
            { status: 400 },
        )
    }

    const file = formData.get('file')
    if (!(file instanceof File) || !file.type.startsWith('image/')) {
        return Response.json({ error: 'file 필드에 이미지 파일이 필요합니다.' }, { status: 400 })
    }

    const altValue = formData.get('alt')
    const alt = typeof altValue === 'string' ? altValue : DEFAULT_HOME_ALT
    const layoutValue = formData.get('layout')
    let layout: unknown
    if (typeof layoutValue === 'string' && layoutValue.trim()) {
        try {
            layout = JSON.parse(layoutValue)
        } catch {
            return Response.json({ error: 'layout JSON 형식이 올바르지 않습니다.' }, { status: 400 })
        }
    }
    const env = context.env as Env
    const config = await putHomeImage(env.PORTFOLIO, env, file, alt, layout)

    return Response.json(config)
}

export const onRequestPatch: PagesFunction<Env> = async (context) => {
    const auth = await verifyBearerToken(context.request, context.env as Env)
    if (!auth.allowed) return auth.response

    let body: { layout?: unknown }
    try {
        body = (await context.request.json()) as { layout?: unknown }
    } catch {
        return Response.json({ error: 'JSON body가 필요합니다.' }, { status: 400 })
    }

    const env = context.env as Env
    const config = await updateHomeImageLayout(env.PORTFOLIO, env, body.layout)
    return Response.json(config)
}
