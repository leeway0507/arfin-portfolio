# Feature 1-3: 사진 삭제·순서 변경 [필수]

> 📄 **Context**: [1-photo-management-context.md](./1-photo-management-context.md)  
> 📄 **Architecture**: [1-photo-api-architecture.md](./1-photo-api-architecture.md)

## Scenario Context

**Epic**: Epic 1 - 사진 관리 (`1-photo-management`)

**Purpose**: 사진 목록을 보고, 업로드·삭제·순서 변경을 통해 포트폴리오 사진을 직접 관리한다.

**User Situation**: 불필요한 사진을 삭제하고, 노출 순서를 드래그로 변경하고 싶어 한다. 직관적인 조작을 원하며, 모바일에서도 가능해야 한다.

**Core User Actions** (본 feature와 관련):

- 포트폴리오에서 제거할 사진을 선택하고 삭제한다.
- 사진의 노출 순서를 변경한다(드래그 앤 드롭).
- 삭제 전 확인을 받는다.

---

## User Story

As a **포토그래퍼(친구)** I want to **사진을 삭제하고 순서를 변경한다**, so that **개발자 도움 없이 포트폴리오를 직접 관리할 수 있다**.

### Acceptance Criteria

- [x] 각 사진에 삭제 버튼(또는 아이콘)이 노출된다.
- [x] 삭제 클릭 시 확인 다이얼로그가 표시되고, 확인 후에만 삭제가 수행된다.
- [x] 삭제 성공 시 목록이 갱신된다. 삭제 실패 시 에러 메시지가 표시된다.
- [x] 사진을 드래그하여 순서를 변경할 수 있다(dnd-kit 사용).
- [x] 순서 변경 시 API(PATCH)를 호출하여 저장하고, 성공 시 목록이 갱신된다. 실패 시 에러 메시지가 표시된다.
- [x] 모바일·데스크톱 모두에서 동작하며, shadcn 지침에 맞는 스타일을 사용한다.

### Technical Notes

| 항목 | 내용 |
|------|------|
| 삭제 API | DELETE `/api/photos?filename=xxx` (인증 필요) |
| 순서 API | PATCH `/api/photos` body: `{ filenames: string[] }` (인증 필요) |
| 드래그 앤 드롭 | @dnd-kit/core, @dnd-kit/sortable (design system) |
| 정렬 대상 | API(R2)에서 가져온 사진만 삭제·순서 변경 가능. static(images_dir) 병합 시 API 출처 항목만 작업 |
