/**
 * 공개 포트폴리오가 사용할 사진 목록 API.
 *
 * - Route: GET /api/photo-list
 * - Auth: 없음
 * - Source: R2의 order.json (저장 위치와 호환 규칙은 photos-r2.ts 참고)
 * - Response: { items: Array<{ filename, caption, order }> }
 *
 * 관리 화면의 GET /api/photos와 같은 응답 형태를 사용한다. order.json에 캡션이
 * 없는 사진은 파일명에서 확장자와 중복 번호를 제거해 기본 캡션을 만든다.
 */
import { getOrderKeyAndList, captionFromFilename } from '../lib/photos-r2'

/** R2에 저장된 배열 순서를 유지한 채 클라이언트용 item 형태로 변환한다. */
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
