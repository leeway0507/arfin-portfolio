# Feature 1-2: 사진 업로드 [필수]

> 📄 **Context**: [1-photo-management-context.md](./1-photo-management-context.md)

## Scenario Context

**Epic**: Epic 1 - 사진 관리 (`1-photo-management`)

**Purpose**: 사진 목록을 보고, 업로드·삭제·순서 변경을 통해 포트폴리오 사진을 직접 관리한다.

**User Situation**: 개발자를 거치지 않고 사진을 올리고 싶어 한다. 여러 장을 한 번에 업로드하고, 드래그 앤 드롭으로 직관적으로 올리며, 업로드 시 이미지가 자동으로 최적화(1MB 이하, webp 등)되어 포트폴리오 성능이 유지되기를 원한다. 모바일에서도 업로드가 가능해야 한다.

**Core User Actions** (본 feature와 관련):

- 새 사진을 추가(업로드)한다. (최적화 후 저장)
- 여러 사진을 한 번에 업로드한다.
- 업로드 진행 상황을 인지한다.

---

## User Story

As a **포토그래퍼(친구)** I want to **새 사진을 업로드하여 포트폴리오에 추가한다**, so that **개발자 도움 없이 직접 포트폴리오를 갱신할 수 있다**.

### Acceptance Criteria

- [x] 사진 관리 화면에서 "사진 업로드" 진입점(버튼 등)이 노출된다.
- [x] 업로드 진입 시 파일 선택 또는 드래그 앤 드롭 영역이 표시된다.
- [x] 이미지 파일(jpg, jpeg, png, webp 등)을 선택하면, 클라이언트에서 최적화(용량 1MB 이하, webp 변환) 후 업로드한다.
- [x] 여러 장의 사진을 한 번에 선택·업로드할 수 있다.
- [x] 업로드 진행 중에는 진행 상황(진행률 또는 개별 파일 상태)이 표시된다.
- [x] 업로드 완료 시 사진 목록이 갱신되고, 목록에 새 사진이 노출된다.
- [x] 업로드 실패 시 에러 메시지와 재시도 유도가 표시된다.
- [x] Empty State("아직 등록된 사진이 없습니다")에 업로드 유도 CTA가 연결된다.
- [x] 모바일·데스크톱 모두에서 업로드 가능하고, shadcn 지침에 맞는 스타일을 사용한다.

### User Flow

1. 사용자가 사진 관리 화면에서 "사진 업로드" 클릭 또는 Empty State의 업로드 CTA 클릭
2. 파일 선택 다이얼로그 또는 드래그 앤 드롭 영역 표시
3. 사용자가 이미지 파일(1장 이상) 선택 또는 드롭
4. 클라이언트에서 이미지 최적화(용량·포맷) 수행
5. 최적화된 파일을 백엔드/스토리지에 업로드
6. 업로드 성공 → 사진 목록 갱신, 새 사진이 목록에 표시
7. 업로드 실패 → 에러 메시지 표시, 재시도 유도

**구현 참고**:

- 클라이언트 최적화: `browser-image-compression` 활용 (이미 의존성 존재).
- 업로드 대상: Cloudflare R2 + Pages Functions 기반 (`/api/photos` POST). [1-photo-api-architecture.md](./1-photo-api-architecture.md)의 R2 전환 정책을 따름.
- 파일명 규칙: `"이름, 연도"` 또는 `"이름(N), 연도"` (동일 이름·연도 시). UI에서 입력 받거나, 업로드 시 파일명 기반으로 자동 생성.

### UI State

- **진입점**: 사진 관리 화면 상단 또는 Empty State에 "사진 업로드" 버튼/CTA.
- **업로드 영역**: 파일 선택 input + 드래그 앤 드롭 overlay. 지원 형식(jpg, png, webp 등) 안내.
- **진행 상태**: 업로드 중 스피너, 진행률 또는 "N/M 업로드 중" 등.
- **완료**: 목록 갱신 후 새 사진 표시. 성공 토스트(선택) 또는 목록 바로 갱신.
- **에러**: 에러 메시지, 재시도 버튼.
- **모바일**: 터치로 파일 선택 가능, 드롭은 데스크톱 위주, 터치 친화적 버튼 제공.

### Technical Notes

| 항목 | 내용 |
|------|------|
| 클라이언트 최적화 | `browser-image-compression` 사용, maxSizeMB: 1, webp 변환 ✅ |
| 업로드 엔드포인트 | Cloudflare Pages Functions `/api/photos` (POST) ✅ |
| 저장소 | R2 `portfolio/` prefix. [1-photo-api-architecture.md](./1-photo-api-architecture.md) 참고 |
| 파일명·캡션 | 파일명 기반, 중복 시 (N) 접미사. Feature 1-1 캡션 규칙 준수 ✅ |

**인증**: Firebase ID token을 `Authorization: Bearer` 헤더로 전달. Pages Function에서 tokeninfo로 검증.
