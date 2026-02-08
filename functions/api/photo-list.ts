/**
 * GET /api/photo-list - 사진 목록 조회 (인증 없음, 메인 포트폴리오용)
 * R2 order/order.json 기반 순서·캡션 반환. Admin GET /api/photos와 동일한 items 형태.
 */
import { getOrderKeyAndList, captionFromFilename } from '../lib/photos-r2'

export const onRequestGet: PagesFunction<Env> = async (context) => {
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
