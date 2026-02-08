# Feature 1-4: 캡션 관리·수정 [필수]

> 📄 **Context**: [1-photo-management-context.md](./1-photo-management-context.md)  
> 📄 **Architecture**: [1-photo-api-architecture.md](./1-photo-api-architecture.md)

## Scenario Context

**Epic**: Epic 1 - 사진 관리 (`1-photo-management`)

**Purpose**: 사진 목록을 보고, 업로드·삭제·순서 변경·**캡션 수정**을 통해 포트폴리오 사진을 직접 관리한다.

**User Situation**: 포트폴리오에 노출되는 사진의 캡션(제목/설명)을 파일명과 별도로 관리하고 수정하고 싶어 한다. 파일명은 그대로 두고, 사이트에 보이는 텍스트만 바꾸고 싶을 때가 있다.

**Core User Actions** (본 feature와 관련):

- 사진별 캡션을 확인한다. (기본값: 파일명 기반, `(N)` 제거)
- 캡션을 수정하여 포트폴리오에 반영한다.
- 수정한 캡션은 목록·갤러리 등에서 일관되게 표시된다.

---

## User Story

As a **포토그래퍼(친구)** I want to **사진별 캡션을 따로 관리하고 수정한다**, so that **파일명을 바꾸지 않고도 노출되는 설명만 바꿀 수 있다**.

### Acceptance Criteria

- [ ] 사진 목록(갤러리)에서 각 사진의 캡션을 확인할 수 있다.
- [ ] 호버 시 삭제·이동(드래그)과 함께 **연필 아이콘**이 노출되고, 클릭 시 캡션 수정 모달이 뜬다.
- [ ] 캡션 편집 시 기존 값이 미리 채워지고, 저장 시에만 API로 반영된다.
- [ ] 캡션 수정 성공 시 목록이 갱신되어 새 캡션이 표시된다. 실패 시 에러 메시지가 표시된다.
- [ ] 캡션을 비우거나 저장하지 않으면 기본값(파일명 기반)으로 노출되도록 한다(선택 사항: 빈 값 허용 시 빈 문자열 저장).
- [ ] 모바일·데스크톱 모두에서 편집 가능하고, shadcn 지침에 맞는 스타일을 사용한다.

### Technical Notes

| 항목 | 내용 |
|------|------|
| 캡션 저장소 | R2 `order/order.json`에서 순서와 함께 관리. 형식: `[{ "filename": "...", "caption": "..."? }, ...]`. caption 없으면 파일명 기반 캡션 사용. |
| 목록 API (GET) | 응답에 `caption` 포함. 항목에 caption 있으면 해당 값, 없으면 `captionFromFilename(filename)` 반환. |
| 캡션 수정 API | PATCH `/api/photos` body: `{ filename: string, caption: string }` (인증 필요). |
| 삭제 시 | 사진 삭제 시 order.json에서 해당 항목 제거 시 캡션도 함께 제거됨. |

### UI

- **호버**: 카드 호버 시 기존처럼 삭제 버튼·이동(그립) 안내와 함께 **연필 아이콘**을 노출한다.
- **캡션 수정**: 연필 아이콘 클릭 시 모달이 뜨고, 기존 캡션이 채워진 입력란에서 수정 후 "저장" 시 API 반영, "취소" 시 닫기.
