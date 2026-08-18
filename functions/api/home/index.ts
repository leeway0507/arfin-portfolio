/**
 * 홈 대표 이미지와 표시 크기 설정 API.
 *
 * - GET /api/home (공개)
 *   설정이 있으면 이미지 key, 대체 텍스트, 갱신 시각, 레이아웃을 반환한다.
 * - POST /api/home (인증 필요)
 *   multipart/form-data의 `file`로 대표 이미지를 교체한다. `alt`와 JSON 문자열
 *   `layout`은 선택값이며, layout을 생략하면 이전 설정을 유지한다.
 * - PATCH /api/home (인증 필요)
 *   JSON body의 `{ layout }`만 갱신하고 이미지와 이미지 갱신 시각은 유지한다.
 *
 * 실제 이미지와 설정 파일의 R2 key는 home-r2.ts에서 한곳에 관리한다.
 */

import { verifyBearerToken } from '../../lib/verify-auth'
import { getHomeImageConfig, putHomeImage, updateHomeImageLayout } from '../../lib/home-r2'

const DEFAULT_HOME_ALT = 'Arfin Yoon main image'

/** 설정이 아직 없으면 imageKey와 updatedAt이 비어 있는 최소 기본값을 반환한다. */
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

/** 대표 이미지 한 장을 고정 R2 key에 덮어쓰고 대응하는 설정 파일을 저장한다. */
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
            return Response.json(
                { error: 'layout JSON 형식이 올바르지 않습니다.' },
                { status: 400 },
            )
        }
    }
    const env = context.env as Env
    const config = await putHomeImage(env.PORTFOLIO, env, file, alt, layout)

    return Response.json(config)
}

/** 이미지 파일을 다시 올리지 않고 레이아웃 설정만 변경한다. */
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
