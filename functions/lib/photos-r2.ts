const ORDER_KEY = 'order/order.json'

export function getPrefix(env: Env): string {
    const rawPrefix = (env.PORTFOLIO_PREFIX ?? 'portfolio') as string
    return rawPrefix === '' ? '' : rawPrefix + '/'
}

type OrderItem = string | { filename: string; caption?: string }

function parseOrderJson(json: unknown): { orderList: string[]; captions: Record<string, string> } {
    const orderList: string[] = []
    const captions: Record<string, string> = {}
    if (!Array.isArray(json)) return { orderList, captions }
    for (const item of json) {
        if (typeof item === 'string') {
            orderList.push(item)
        } else if (item && typeof item === 'object' && 'filename' in item && typeof (item as OrderItem & { filename: unknown }).filename === 'string') {
            const filename = (item as { filename: string; caption?: string }).filename
            const caption = (item as { filename: string; caption?: string }).caption
            orderList.push(filename)
            if (typeof caption === 'string' && caption.trim() !== '') {
                captions[filename] = caption.trim()
            }
        }
    }
    return { orderList, captions }
}

/** order.json 키, 순서 목록, 캡션 맵 반환. 기존 string[] 형식과 새 { filename, caption? }[] 형식 모두 지원 */
export async function getOrderKeyAndList(
    bucket: R2Bucket,
    env: Env,
): Promise<{ orderKey: string; orderList: string[]; captions: Record<string, string> }> {
    const prefix = getPrefix(env)
    const orderKeys = prefix ? [prefix + ORDER_KEY] : [ORDER_KEY, 'portfolio/order.json']

    for (const key of orderKeys) {
        try {
            const orderObj = await bucket.get(key)
            if (orderObj?.body) {
                const json = (await orderObj.json()) as unknown
                const { orderList, captions } = parseOrderJson(json)
                return { orderKey: key, orderList, captions }
            }
        } catch {
            // 다음 경로 시도
        }
    }
    const defaultKey = prefix ? prefix + ORDER_KEY : 'portfolio/order.json'
    return { orderKey: defaultKey, orderList: [], captions: {} }
}

/** order.json에서 파싱된 filename 목록만 반환 (읽기 전용) */
export async function getOrderList(bucket: R2Bucket, env: Env): Promise<string[]> {
    const { orderList } = await getOrderKeyAndList(bucket, env)
    return orderList
}

export function captionFromFilename(filename: string): string {
    return filename
        .replace(/\.(webp|jpg|jpeg|png)$/i, '')
        .replace(/\s*\([^)]*\)\s*$/, '')
        .trim()
}

/** order.json에 순서+캡션 통합 저장. caption 없으면 항목은 { filename }만 */
export async function putOrder(
    bucket: R2Bucket,
    env: Env,
    orderKey: string,
    orderList: string[],
    captions: Record<string, string>,
): Promise<void> {
    const items = orderList.map((filename) => {
        const caption = captions[filename]
        if (typeof caption === 'string' && caption.trim() !== '') {
            return { filename, caption: caption.trim() }
        }
        return { filename }
    })
    await bucket.put(orderKey, JSON.stringify(items), {
        httpMetadata: { contentType: 'application/json' },
    })
}

/** 캡션 하나 수정. order.json 통합 형식으로 저장 */
export async function setCaption(
    bucket: R2Bucket,
    env: Env,
    filename: string,
    caption: string,
): Promise<void> {
    const { orderKey, orderList, captions } = await getOrderKeyAndList(bucket, env)
    if (caption.trim() === '') {
        delete captions[filename]
    } else {
        captions[filename] = caption.trim()
    }
    await putOrder(bucket, env, orderKey, orderList, captions)
}

/** 사진 삭제 시 해당 filename을 순서·캡션에서 제거 (호출측에서 putOrder로 저장) */
export function removeCaptionFromMap(
    captions: Record<string, string>,
    filename: string,
): void {
    delete captions[filename]
}
