# Feature 0-1: Google 로그인 및 Admin 진입 [필수]

> 📄 **Context**: [0-admin-auth-context.md](./0-admin-auth-context.md)

## Scenario Context

**Epic**: Epic 0 - Admin 진입 및 인증 (`0-admin-auth`)

**Purpose**: Google 인증을 통해 Admin에 로그인하고, 사진 관리 화면으로 진입한다.

**User Situation**: 포트폴리오 사진을 직접 관리하려면 개발자에게 매번 요청해야 하는 상황에서, 본인만 접근 가능한 Admin이 필요하다. 본인 계정으로만 로그인되어 Admin을 쓸 수 있기를 원하며, Cloudflare Pages 기반 Static 환경에서 **Firebase Authentication**으로 Google 로그인·단일 사용자(친구 한 명) 수준 인증을 사용한다. 모바일에서도 로그인·접근이 가능해야 한다.

**Core User Actions** (본 feature와 관련):

- Admin 진입 경로에서 로그인 필요 상태를 인지한다.
- Google 계정으로 로그인한다.
- 로그인 성공 시 사진 관리(Epic 1) 화면으로 이동한다.

---

## User Story

As a **포토그래퍼(친구)** I want to **Google 계정으로 로그인하여 Admin에 접근한다**, so that **개발자 없이 사진을 직접 관리할 수 있다**.

### Acceptance Criteria

- [ ] Admin URL 접근 시 로그인되지 않은 사용자는 로그인 유도 화면을 본다.
- [ ] "Google로 로그인" 등 로그인 버튼을 누르면 Google OAuth 플로우가 시작된다.
- [ ] 허용된 Google 계정으로 인증이 완료되면 사진 관리 화면(Epic 1)으로 리다이렉트된다.
- [ ] 허용되지 않은 계정으로 로그인 시도 시 안내 메시지가 표시되며, Admin 내부로 진입할 수 없다.
- [ ] 이미 로그인된 사용자가 Admin 진입 경로에 접근하면 사진 관리 화면으로 바로 이동한다.

### User Flow

1. 사용자가 Admin URL에 접근 → 미인증 시 로그인 화면 표시(로그인 버튼 노출).
2. 사용자가 "Google로 로그인" 클릭 → Firebase Auth Google Sign-In 리다이렉트(또는 팝업).
3. 사용자가 Google에서 로그인·권한 허용 → Firebase Auth 콜백으로 복귀.
4. Firebase Auth에서 인증 완료 후, 허용 목록(Firebase Auth 허용 이메일 또는 Firestore 규칙)과 비교 → 일치 시 사진 관리 화면으로 리다이렉트.
5. 불일치 시 → "이 계정은 Admin 접근 권한이 없습니다" 등 메시지 표시, 로그인 화면 유지.

**구현 참고**: Firebase Authentication을 사용한다. Google OAuth·세션 관리·토큰 갱신은 Firebase SDK가 클라이언트에서 처리하며, Static/Cloudflare Pages 환경과 호환된다. 허용 계정은 Firebase Console 또는 Firestore Security Rules 등으로 제한한다.

### 구현 지침

- **Admin 진입 경로**: 사이트(포트폴리오 등)에 Admin URL로 이동하는 버튼·링크를 두지 않는다. 사용자가 Admin URL을 **직접 입력**하여 접근하는 방식으로 한다.

### UI State

- **Empty State**: 로그인 전 기본 화면. "Admin에 로그인하세요" 등 문구와 Google 로그인 버튼 표시.
- **Loading State**: Google 인증 처리 중(리다이렉트·콜백 처리 중) 스피너 또는 로딩 메시지 표시.
- **Error State**: 인증 실패, 권한 없음, 네트워크 오류 시 안내 메시지 표시. 필요 시 재시도(다시 로그인) 유도.
