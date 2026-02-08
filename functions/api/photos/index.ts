/**
 * GET    /api/photos - R2 order.json 조회 (인증 필요)
 * POST   /api/photos - 사진 업로드 (multipart/form-data, files 필드) (인증 필요)
 * DELETE /api/photos?filename=xxx - 사진 삭제 (인증 필요)
 * PATCH  /api/photos - 순서 변경 body: { filenames: string[] } (인증 필요)
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

/** 경로만 제거하여 원본 파일명 반환 (blob 저장용) */
function getOriginalFilename(name: string): string {
    return name.replace(/^.*[/\\]/, '').trim() || 'image'
}

/** 공백·특수문자 정규화. CDN/URL 호환을 위해 공백 → 하이픈 */
function sanitizeFilename(name: string): string {
    const base = name
        .replace(/\s+/g, '-')
        .replace(/[^\w.-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    return base || 'image'
}

/** 기존 목록에 없는 고유 파일명 반환 */
function uniqueFilename(base: string, existing: Set<string>): string {
    if (!existing.has(base)) return base
    const extMatch = base.match(IMAGE_EXT)
    const ext = extMatch ? extMatch[0] : '.webp'
    const stem = base.slice(0, -ext.length)
    let n = 1
    while (existing.has(`${stem} (${n})${ext}`)) n++
    return `${stem} (${n})${ext}`
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

    // 캡션 수정: body에 filename + caption
    if (typeof body.filename === 'string' && body.caption !== undefined) {
        await setCaption(bucket, env, body.filename, String(body.caption))
        return Response.json({ ok: true })
    }

    // 순서 변경: body에 filenames 배열
    const raw = body.filenames
    if (!Array.isArray(raw)) {
        return Response.json({ error: 'body.filenames 배열 또는 body.filename+caption이 필요합니다.' }, { status: 400 })
    }
    const filenames = raw.filter((x): x is string => typeof x === 'string')
    const { orderKey, captions } = await getOrderKeyAndList(bucket, env)

    await putOrder(bucket, env, orderKey, filenames, captions)

    return Response.json({ ok: true, order: filenames })
}
