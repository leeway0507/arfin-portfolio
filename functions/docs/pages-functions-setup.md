# Cloudflare Pages Functions + R2 설정 가이드

## 로컬 개발

**`pnpm dev`(Next만)에서는 API가 404입니다.**  
Pages Functions는 wrangler가 서빙할 때만 동작합니다.

### 실시간 반영 (추천)

Next.js는 빌드하지 않고 핫 리로드, API는 wrangler가 처리하게 하려면:

1. **`.env.local`에 API 직접 호출 설정** (output: export 사용 시 Next API 라우트가 500 에러):
    ```env
    NEXT_PUBLIC_API_BASE=http://localhost:8788
    ```
2. **터미널 1개**에서 실행:
    ```bash
    pnpm dev:local
    ```
    → API(wrangler) `http://localhost:8788` + Next `http://localhost:3000` 이 동시에 뜹니다. 브라우저는 **`http://localhost:3000`** 만 사용하면 됩니다.

Functions 코드만 수정한 경우에는 `pnpm dev:api`만 따로 돌리거나, `dev:local` 전체를 재시작하면 됩니다.

> **참고**: 로컬 개발 시 Next.js는 빌드하지 않는다. 빌드는 배포 시에만 수행한다.

## `functions/api/auth` 구현 요약 (context 참고)

| 경로                      | 파일                             | 구현 내용                                                                                                                                                                                                                             |
| ------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/callback` | `functions/api/auth/callback.ts` | Firebase ID 토큰 검증(identitytoolkit lookup) → `ALLOWED_ADMIN_EMAILS`와 비교해 허용 여부 반환. Request: `{ idToken }`. Response: `{ allowed, email?, uid? }` 또는 `{ error }`. 사용 env: `FIREBASE_API_KEY`, `ALLOWED_ADMIN_EMAILS`. |

## `functions/api/photos` 구현 요약 (context 참고)

| Method | 경로                       | 파일                            | 구현 내용                                                                                                                                                          |
| ------ | -------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/photos`              | `functions/api/photos/index.ts` | R2 `order/order.json` 조회. 인증 필요. Response: `{ items: { filename, caption, order }[] }`. 이미지 URL은 프론트에서 `NEXT_PUBLIC_IMAGE_URL` + filename으로 구성. |
| DELETE | `/api/photos?filename=xxx` | 동일                            | 쿼리 `filename`에 해당하는 항목을 order 목록에서 제거하고, R2 객체(이미지) 삭제 후 order.json 저장. 인증 필요. Response: `{ ok: true }` 또는 `{ error }`.          |
| PATCH  | `/api/photos`              | 동일                            | Request body: `{ filenames: string[] }`. R2 `order/order.json`을 해당 순서로 덮어쓰기. 인증 필요. Response: `{ ok: true }` 또는 `{ error }`.                       |

사용 env: `PORTFOLIO`(R2 bucket 바인딩), `PORTFOLIO_PREFIX`(선택, 기본 `portfolio`). 인증은 `Authorization: Bearer <idToken>`으로 동일.
