/**
 * 사진 목록과 캡션을 R2의 order.json 한 파일로 관리하는 저장소 모듈.
 *
 * 현재 저장 형식은 `[{ filename, caption? }, ...]`이며 배열 위치가 화면 순서다.
 * 과거 형식인 `string[]`도 계속 읽을 수 있어 기존 R2 데이터를 별도 마이그레이션
 * 없이 사용할 수 있다. 새로 저장할 때는 항상 현재 객체 배열 형식으로 쓴다.
 */
const ORDER_KEY = 'order/order.json'

/**
 * R2 객체 앞에 붙일 namespace를 반환한다.
 * `PORTFOLIO_PREFIX`가 없으면 `portfolio/`가 기본값이고, 명시적으로 빈 문자열을
 * 설정한 환경에서는 bucket root를 사용한다. 반환값은 비어 있거나 `/`로 끝난다.
 */
export function getPrefix(env: Env): string {
    const rawPrefix = (env.PORTFOLIO_PREFIX ?? 'portfolio') as string
    return rawPrefix === '' ? '' : rawPrefix + '/'
}

type OrderItem = string | { filename: string; caption?: string }

/**
 * legacy/current order.json을 공통 메모리 형태로 변환한다.
 * 배열이 아니면 빈 결과를 반환하고, 형식이 맞지 않는 배열 항목은 건너뛴다.
 * 캡션은 공백을 제거한 뒤 비어 있지 않은 값만 별도 map에 보관한다.
 */
function parseOrderJson(json: unknown): { orderList: string[]; captions: Record<string, string> } {
    const orderList: string[] = []
    const captions: Record<string, string> = {}
    if (!Array.isArray(json)) return { orderList, captions }
    for (const item of json) {
        if (typeof item === 'string') {
            orderList.push(item)
        } else if (
            item &&
            typeof item === 'object' &&
            'filename' in item &&
            typeof (item as OrderItem & { filename: unknown }).filename === 'string'
        ) {
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

/**
 * 현재 환경에서 사용할 order.json과 파싱된 순서/캡션을 함께 반환한다.
 *
 * prefix가 있으면 `<prefix>/order/order.json`만 조회한다. bucket root를 쓰는 환경은
 * `order/order.json`을 먼저 보고, 기존 데이터 호환 경로인 `portfolio/order.json`도
 * 확인한다. 파일이 없거나 읽을 수 없으면 이후 저장에 사용할 기본 key와 빈 목록을
 * 반환한다.
 */
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
            // 후보 파일이 손상되었거나 읽기에 실패하면 legacy 후보 경로를 계속 확인한다.
        }
    }
    const defaultKey = prefix ? prefix + ORDER_KEY : 'portfolio/order.json'
    return { orderKey: defaultKey, orderList: [], captions: {} }
}

/** key나 캡션이 필요 없는 호출부를 위한 읽기 전용 filename 목록 helper. */
export async function getOrderList(bucket: R2Bucket, env: Env): Promise<string[]> {
    const { orderList } = await getOrderKeyAndList(bucket, env)
    return orderList
}

/**
 * 저장된 캡션이 없을 때 사용할 기본 캡션을 파일명에서 만든다.
 * webp/jpg/jpeg/png 확장자와 중복 업로드 시 붙는 마지막 `(n)`을 제거한다.
 */
export function captionFromFilename(filename: string): string {
    return filename
        .replace(/\.(webp|jpg|jpeg|png)$/i, '')
        .replace(/\s*\([^)]*\)\s*$/, '')
        .trim()
}

/**
 * 순서 배열과 캡션 map을 현재 객체 배열 형식으로 합쳐 order.json에 저장한다.
 * 비어 있는 캡션은 직렬화하지 않아 읽을 때 파일명 기반 기본 캡션을 쓰게 한다.
 */
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

/**
 * 사진 한 장의 사용자 캡션을 바꾸고 전체 order.json을 다시 저장한다.
 * 빈 문자열은 저장 캡션 삭제를 뜻하며 사진 순서 자체는 변경하지 않는다.
 */
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

/**
 * 사진 삭제 전에 메모리의 캡션 map에서 항목을 제거한다.
 * 이 함수는 map만 변경하므로 호출부가 변경된 순서와 함께 putOrder를 호출해야 한다.
 */
export function removeCaptionFromMap(captions: Record<string, string>, filename: string): void {
    delete captions[filename]
}
