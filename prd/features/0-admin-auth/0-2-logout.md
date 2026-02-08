# Feature 0-2: 로그아웃 [필수]

> 📄 **Context**: [0-admin-auth-context.md](./0-admin-auth-context.md)

## Scenario Context

**Epic**: Epic 0 - Admin 진입 및 인증 (`0-admin-auth`)

**Purpose**: Google 인증을 통해 Admin에 로그인하고, 사진 관리 화면으로 진입한다. 필요 시 로그아웃으로 Admin 접근을 종료한다.

**User Situation**: Admin 사용을 마쳤을 때 또는 공용 기기에서 세션을 끝내고 싶을 때, 로그아웃으로 본인 계정의 Admin 접근을 안전하게 종료하고 싶어 한다.

**Core User Actions** (본 feature와 관련):

- 로그아웃하여 Admin 접근을 종료한다.

---

## User Story

As a **포토그래퍼(친구)** I want to **로그아웃하여 Admin 접근을 종료한다**, so that **다른 사람이 내 계정으로 Admin에 접근할 수 없도록 하거나, 공용 기기에서 세션을 안전하게 끝낼 수 있다**.

### Acceptance Criteria

- [ ] 로그인된 상태에서 "로그아웃" 버튼(또는 동일 목적의 액션)을 노출한다.
- [ ] 사용자가 로그아웃을 실행하면 Firebase Auth 세션이 무효화된다.
- [ ] 로그아웃 완료 후 로그인 화면(Epic 0)으로 리다이렉트된다.
- [ ] 로그아웃 후 Admin 내부 URL에 직접 접근하면 로그인 화면으로 유도된다.

### User Flow

1. 사용자가 사진 관리 화면(또는 Admin 내 어디서든)에서 "로그아웃" 클릭.
2. Firebase Auth `signOut()` 호출로 세션 무효화.
3. 로그인 화면으로 리다이렉트.

**구현 참고**: Firebase Authentication 사용 시 `auth.signOut()`을 호출하면 클라이언트에서 세션이 즉시 무효화된다. 별도 서버/쿠키 처리 없이 Static 환경에서 동작한다.

### UI State

- **Empty State**: 해당 없음(로그아웃은 버튼 액션).
- **Loading State**: 로그아웃 처리 중 짧은 로딩 표시(선택). 즉시 리다이렉트할 경우 생략 가능.
- **Error State**: 로그아웃 실패(네트워크 등) 시 안내 메시지와 재시도 유도. 로컬 쿠키만 제거하는 방식이면 실패 가능성은 낮음.
