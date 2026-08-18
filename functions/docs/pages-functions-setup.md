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

## 운영 Google 관리자 로그인

운영 도메인에서는 Firebase Google 로그인을 사용한다. 배포 전에 다음 조건을 모두 확인한다.

- Firebase Authentication에서 Google provider를 활성화한다.
- 실제 배포 도메인을 Firebase Authentication의 Authorized domains에 등록한다.
- Next.js 빌드 환경에 `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
  `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`,
  `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`를 설정한다.
- Pages Functions 런타임에 `FIREBASE_API_KEY`, `ALLOWED_ADMIN_EMAILS`를 설정한다.

`NEXT_PUBLIC_FIREBASE_*` 값은 정적 프런트엔드 빌드 시 포함되어야 한다. Wrangler의 런타임
변수만으로는 대체되지 않는다. 로컬 loopback 주소에서는 Firebase를 초기화하지 않고 개발용
직접 로그인을 사용한다.

## API 구현 찾아보기

전체 요청 흐름, 파일별 책임, API 계약, R2 구조와 환경 변수는
[`functions/README.md`](../README.md)에 정리되어 있다. 각 소스 파일의 상단 주석에는
해당 endpoint의 인증 여부와 요청/응답 형식이, `lib`의 함수 주석에는 저장 및
호환 규칙이 설명되어 있다.
