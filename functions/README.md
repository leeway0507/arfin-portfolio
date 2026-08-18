# Functions 구조 안내

이 디렉터리는 Cloudflare Pages Functions로 실행되는 서버 코드다. Next.js의 `app/`
라우트와 별개이며, 파일 경로가 그대로 API 경로가 된다. 예를 들어
`functions/api/photos/index.ts`는 `/api/photos`를 처리한다.

## 요청 흐름

```text
Next.js 클라이언트
  → functions/_middleware.ts (CORS)
  → functions/api/** (요청 검증과 HTTP 응답)
  → functions/lib/** (인증 또는 R2 읽기/쓰기)
  → Cloudflare R2 / Firebase Identity Toolkit
```

- `_middleware.ts`는 CORS만 처리하며 사용자를 인증하지 않는다.
- 공개 API는 목록/이미지를 읽기만 한다.
- 관리자 API는 먼저 `verifyBearerToken()`을 호출하고 실패 응답을 즉시 반환한다.
- API handler는 HTTP 형식 검증을, `lib` 모듈은 외부 서비스와 데이터 규칙을 담당한다.

## 파일별 역할

| 파일                   | 역할                                              | 인증                  |
| ---------------------- | ------------------------------------------------- | --------------------- |
| `api/photo-list.ts`    | 포트폴리오 사진 목록과 캡션 공개 조회             | 없음                  |
| `api/photos/image.ts`  | R2 이미지 공개 프록시                             | 없음                  |
| `api/photos/index.ts`  | 사진 목록, 업로드, 삭제, 순서/캡션 수정           | 필요                  |
| `api/home/index.ts`    | 홈 대표 이미지 조회, 교체, 레이아웃 수정          | GET만 공개            |
| `api/auth/callback.ts` | 로그인 직후 Firebase 토큰과 관리자 허용 여부 확인 | ID 토큰을 body로 전달 |
| `lib/verify-auth.ts`   | 보호 API의 Bearer 토큰/관리자 이메일 공통 검증    | —                     |
| `lib/photos-r2.ts`     | 사진 순서와 캡션의 R2 저장 규칙                   | —                     |
| `lib/home-r2.ts`       | 홈 이미지와 레이아웃 설정의 R2 저장 규칙          | —                     |
| `types.d.ts`           | Wrangler가 생성한 Cloudflare runtime 타입         | 직접 수정 금지        |

## API 요약

| Method | Path                             | 요청                                         | 주요 응답                                   |
| ------ | -------------------------------- | -------------------------------------------- | ------------------------------------------- |
| GET    | `/api/photo-list`                | 없음                                         | `{ items: [{ filename, caption, order }] }` |
| GET    | `/api/photos/image?filename=...` | query                                        | 이미지 stream                               |
| GET    | `/api/photos`                    | Bearer token                                 | `{ items: [...] }`                          |
| POST   | `/api/photos`                    | multipart `files`                            | `{ ok, uploaded, order }`                   |
| DELETE | `/api/photos?filename=...`       | Bearer token                                 | `{ ok, order }`                             |
| PATCH  | `/api/photos`                    | `{ filenames }` 또는 `{ filename, caption }` | `{ ok, order? }`                            |
| GET    | `/api/home`                      | 없음                                         | 홈 이미지 설정                              |
| POST   | `/api/home`                      | multipart `file`, `alt?`, `layout?`          | 저장된 홈 이미지 설정                       |
| PATCH  | `/api/home`                      | `{ layout }`                                 | 변경된 홈 이미지 설정                       |
| POST   | `/api/auth/callback`             | `{ idToken }`                                | `{ allowed, email?, uid? }`                 |

관리자 API의 `Authorization` 헤더 형식은 `Bearer <Firebase ID token>`이다.

## R2 저장 구조

`PORTFOLIO_PREFIX=portfolio`를 예로 들면 다음 key를 사용한다.

```text
portfolio/
├── order/order.json  # 사진 순서 + 선택 캡션
├── home/main.webp    # 현재 홈 대표 이미지
├── home/main.json    # 홈 이미지 메타데이터 + 레이아웃
└── <filename>        # 업로드한 포트폴리오 사진
```

사진 목록의 현재 형식은 다음과 같다. 배열 순서가 노출 순서이며, `caption`이 없으면
API가 파일명으로 기본 캡션을 만든다.

<!-- prettier-ignore -->
```json
[
    { "filename": "portrait.webp", "caption": "Portrait" },
    { "filename": "street.webp" }
]
```

기존 `string[]` 형식도 읽을 수 있지만 다음 저장 시 위 객체 배열 형식으로 통일된다.

## 환경 변수와 binding

| 이름                   | 용도                                                            |
| ---------------------- | --------------------------------------------------------------- |
| `PORTFOLIO`            | Cloudflare R2 bucket binding                                    |
| `PORTFOLIO_PREFIX`     | R2 key prefix. 미설정 시 `portfolio`, 빈 문자열이면 bucket root |
| `FIREBASE_API_KEY`     | Firebase Identity Toolkit 사용자 조회용 API key                 |
| `ALLOWED_ADMIN_EMAILS` | 관리자 이메일의 쉼표 구분 allowlist                             |

로컬 실행 방법은 [`docs/pages-functions-setup.md`](./docs/pages-functions-setup.md)를 참고한다.
