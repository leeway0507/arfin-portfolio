/**
 * 관리자용 사진 관리 API. 모든 메서드는 Firebase Bearer ID 토큰 인증이 필요하다.
 *
 * - GET /api/photos
 *   R2의 저장 순서와 캡션을 { items: [{ filename, caption, order }] }로 반환한다.
 * - POST /api/photos
 *   multipart/form-data의 `files` 필드로 받은 이미지들을 R2에 업로드하고 목록 끝에 추가한다.
 * - DELETE /api/photos?filename=...
 *   order.json의 목록/캡션과 실제 R2 이미지 객체를 함께 삭제한다.
 * - PATCH /api/photos
 *   `{ filenames: string[] }`은 전체 순서를 교체하고, `{ filename, caption }`은 캡션 하나를 바꾼다.
 *
 * 이미지 객체는 `<PORTFOLIO_PREFIX>/<filename>`에 저장한다. 목록/캡션의
 * order.json key는 기존 배포 데이터까지 읽을 수 있도록 photos-r2.ts에서 결정한다.
 */

import { verifyBearerToken } from '../../lib/verify-auth'
import {
    getOrderKeyAndList,
    putOrder,
    setCaption,
    removeCaptionFromMap,
    captionFromFilename,
    getPrefix,
} from '../../lib/photos-r2'

const IMAGE_EXT = /\.(webp|jpg|jpeg|png|gif)$/i

/** 브라우저가 파일명에 경로를 포함해 보내더라도 마지막 경로 조각만 남긴다. */
function getOriginalFilename(name: string): string {
    return name.replace(/^.*[/\\]/, '').trim() || 'image'
}

/** CDN 경로에서 예측 가능하게 다룰 수 있도록 공백과 특수문자를 하이픈으로 정규화한다. */
function sanitizeFilename(name: string): string {
    const base = name
        .replace(/\s+/g, '-')
        .replace(/[^\w.-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    return base || 'image'
}

/** 같은 이름이 있으면 `name (1).ext`, `name (2).ext` 형태의 빈 이름을 찾는다. */
function uniqueFilename(base: string, existing: Set<string>): string {
    if (!existing.has(base)) return base
    const extMatch = base.match(IMAGE_EXT)
    const ext = extMatch ? extMatch[0] : '.webp'
    const stem = base.slice(0, -ext.length)
    let n = 1
    while (existing.has(`${stem} (${n})${ext}`)) n++
    return `${stem} (${n})${ext}`
}

/**
 * 이미지들을 차례로 업로드한 뒤 새 순서를 order.json에 한 번 저장한다.
 * 성공 응답의 `uploaded`는 실제 저장에 사용한 중복 방지 파일명 목록이다.
 */
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

    const rawFiles = formData.getAll('files').filter((v): v is File => v instanceof File)
    if (rawFiles.length === 0) {
        return Response.json({ error: 'files 필드에 이미지 파일이 필요합니다.' }, { status: 400 })
    }

    const env = context.env as Env
    const bucket = env.PORTFOLIO
    const prefix = getPrefix(env)
    const { orderKey, orderList, captions } = await getOrderKeyAndList(bucket, env)
    const existingSet = new Set(orderList)
    const uploaded: string[] = []
    const newOrderList = [...orderList]

    for (const file of rawFiles) {
        const raw = getOriginalFilename(file.name)
        const base = sanitizeFilename(raw)
        const filename = uniqueFilename(base, existingSet)
        existingSet.add(filename)
        newOrderList.push(filename)

        const objectKey = prefix ? prefix + filename : filename
        const body = await file.arrayBuffer()
        const contentType = file.type || 'image/webp'

        await bucket.put(objectKey, body, {
            httpMetadata: { contentType },
        })
        uploaded.push(filename)
    }

    await putOrder(bucket, env, orderKey, newOrderList, captions)

    return Response.json({ ok: true, uploaded, order: newOrderList })
}

/** 저장된 캡션이 없으면 파일명으로 기본 캡션을 만들어 관리자 목록을 반환한다. */
export const onRequestGet: PagesFunction<Env> = async (context) => {
    const auth = await verifyBearerToken(context.request, context.env as Env)
    if (!auth.allowed) return auth.response

    const env = context.env as Env
    const bucket = env.PORTFOLIO
    const { orderList, captions } = await getOrderKeyAndList(bucket, env)

    const items = orderList.map((filename, index) => ({
        filename,
        caption: captions[filename] ?? captionFromFilename(filename),
        order: index,
    }))

    return Response.json({ items })
}

/** 목록에 존재하는 사진만 삭제하며, 목록 메타데이터와 R2 객체를 함께 정리한다. */
export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const auth = await verifyBearerToken(context.request, context.env as Env)
    if (!auth.allowed) return auth.response

    const filename = context.request.url
        ? new URL(context.request.url).searchParams.get('filename')
        : null
    if (!filename || !filename.trim()) {
        return Response.json({ error: 'filename 쿼리가 필요합니다.' }, { status: 400 })
    }

    const env = context.env as Env
    const bucket = env.PORTFOLIO
    const prefix = getPrefix(env)
    const { orderKey, orderList, captions } = await getOrderKeyAndList(bucket, env)

    const nextList = orderList.filter((f) => f !== filename)
    if (nextList.length === orderList.length) {
        return Response.json({ error: '목록에 해당 파일이 없습니다.' }, { status: 404 })
    }

    removeCaptionFromMap(captions, filename)
    await putOrder(bucket, env, orderKey, nextList, captions)

    const objectKey = prefix ? prefix + filename : filename
    await bucket.delete(objectKey)

    return Response.json({ ok: true, order: nextList })
}

/**
 * 하나의 PATCH 경로에서 캡션 수정과 순서 변경을 구분한다.
 * `filename`과 `caption`이 있으면 캡션 수정으로 우선 처리하고, 그 외에는
 * `filenames` 배열을 새 전체 순서로 저장한다.
 */
export const onRequestPatch: PagesFunction<Env> = async (context) => {
    const auth = await verifyBearerToken(context.request, context.env as Env)
    if (!auth.allowed) return auth.response

    let body: { filenames?: unknown; filename?: string; caption?: string }
    try {
        body = (await context.request.json()) as {
            filenames?: unknown
            filename?: string
            caption?: string
        }
    } catch {
        return Response.json({ error: 'JSON body가 필요합니다.' }, { status: 400 })
    }

    const env = context.env as Env
    const bucket = env.PORTFOLIO

    // 캡션 수정 요청: 빈 문자열은 사용자 캡션을 제거해 파일명 기반 캡션으로 되돌린다.
    if (typeof body.filename === 'string' && body.caption !== undefined) {
        await setCaption(bucket, env, body.filename, String(body.caption))
        return Response.json({ ok: true })
    }

    // 순서 변경 요청: 문자열 항목만 남긴 배열을 order.json의 새 기준 목록으로 사용한다.
    const raw = body.filenames
    if (!Array.isArray(raw)) {
        return Response.json(
            { error: 'body.filenames 배열 또는 body.filename+caption이 필요합니다.' },
            { status: 400 },
        )
    }
    const filenames = raw.filter((x): x is string => typeof x === 'string')
    const { orderKey, captions } = await getOrderKeyAndList(bucket, env)

    await putOrder(bucket, env, orderKey, filenames, captions)

    return Response.json({ ok: true, order: filenames })
}
