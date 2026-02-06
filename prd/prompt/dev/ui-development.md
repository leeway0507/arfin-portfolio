## Overview

PRD Acceptance Criteria 기반으로 레퍼런스 UI를 디자인 시스템으로 리팩토링하여 완성된 feature 구현.

**목표**: AC → Todo → 디자인 시스템 적용 → 완성된 Feature

## Input

### 필수 파일 (미존재 시 작업 중단)

| 파일           | 경로 패턴                                               | 내용                       |
| -------------- | ------------------------------------------------------- | -------------------------- |
| Feature PRD    | `{project}/features/{epic-name}/{feature-name}.md`      | Goal, User Story, Flow, AC |
| Context        | `{project}/features/{epic-name}/{epic-name}-context.md` | 에픽 컨텍스트              |
| Feature 구현체 | `{feature-name}.tsx`                                    | 리팩토링 대상 레퍼런스 UI  |

**파일·폴더 명 명칭 (번호 미포함)**

- `{epic-name}`: 에픽 이름만 (예: `1-admin-dashboard` → `admin-dashboard`)
- `{feature-name}`: 기능 이름만 (예: `1-1-portfolio-overview` → `portfolio-overview`)
- Output 생성 시에도 `{feature-name}.tsx`처럼 번호 없이 사용

### 참고 문서

| 문서                                   | 용도                 |
| -------------------------------------- | -------------------- |
| `pm/prompts/context/design-system.md`  | 디자인 시스템 가이드 |
| `pm/prompts/utils/devils-advocate.md`  | PRD 검증 프로세스    |
| `pm/prompts/utils/create-mock-data.md` | Mock data 생성       |

## Output

**리팩토링된 `{feature-name}.tsx**` (번호 없음, 모든 조건 충족):

- ✅ 모든 AC 구현
- ✅ 디자인 시스템 일관 적용
- ✅ `apps/web/apis/{domain}/types.ts` 타입 사용
- ✅ Tanstack Query hooks 사용
- ✅ Mock data 기반 동작
- ✅ Lint 오류 없음
- ✅ UX 개선

## Step

### 🔒 실행 원칙 (모든 단계 공통)

1. **순차 실행**: 단계별 완료 후 다음 진행 (동시 진행 금지)
2. **단일 작업**: 한 번에 하나의 작업만 처리
3. **필수 보고**: 각 단계 완료 후 사용자 보고 + 확인 대기
4. **Todo 관리**: `todo_write`로 진행 상황 추적

### 1단계: PRD 분석 → Todo 생성

**작업:**

1. PRD 파일 존재 확인 및 읽기 (Goal, User Story, Flow, AC)
2. AC → 구현 작업 변환
3. 우선순위 정렬 (의존성 고려, AC 순서 기본)
4. `todo_write` 생성 (각 AC → todo, 모두 `pending`)

**완료:** PRD 분석 ✓ + Todo 생성 ✓ → 사용자 보고

### 2단계: API Types + Mock Data + API 함수 + Tanstack Query 생성

**작업 위치**: `apps/web/apis/{domain}/` — API 관련 모든 작업은 여기서 수행한다.

**폴더 구조 예시** (`community-managements` 기준):

```
apps/web/apis/
  {domain}/
    types.ts              # Req, Res 타입 정의
    index.ts              # API 함수 정의
    mock/
      mock-generator.mjs  # mock JSON 생성기
      *-mock.json         # 생성된 mock (예: portfolio-summary-mock.json)

apps/web/hooks/tanstack/
  use-{feature}-query.ts  # Tanstack Query hooks
```

#### 2-1. `types.ts` 생성/수정

**위치**: `apps/web/apis/{domain}/types.ts`

**작업 내용:**

1. API 요청/응답 타입 정의 (Req, Res)
2. Mock API 실행을 위한 타입 설계

**타입 설계 핵심 원칙:**

| 원칙                 | 설명                                              | 예시                                                         |
| -------------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| **순수 데이터만**    | React/UI 타입 제외, 백엔드 응답과 1:1 매칭        | ❌ `icon: ReactElement` / ✅ `icon: string`                  |
| **UI 확장 분리**     | UI 필요 타입은 컴포넌트/훅에서 `extends`          | 훅: `interface WithIcon extends Base { icon: ReactElement }` |
| **공통 타입 재사용** | `apis/common/types.ts`의 `ApiResponse<T>` 등 활용 | 중복 정의 금지                                               |
| **중복 방지**        | 기존 타입 검색 후 재사용/확장                     | 불가피한 경우 명확한 네이밍                                  |
| **계산 필드 제거**   | 런타임 계산 가능 필드 제외                        | ❌ `totalCount` / ✅ `items.length`                          |
| **미사용 타입 제거** | 코드베이스 검색하여 사용 여부 확인 후 정리        | -                                                            |
| **명확성**           | 주석으로 용도/의도 명시                           | API 응답 vs 도메인 타입 분리                                 |
| **Req/Res 분리**     | 요청 타입은 `*Request`, 응답 타입은 `*Response`   | `CreateEventRequest`, `EventResponse`                        |

#### 2-2. Mock Data 생성

1. `create-mock-data.md` 참고하여 `apps/web/apis/{domain}/mock/mock-generator.mjs` 생성
2. Generator 실행 → `apps/web/apis/{domain}/mock/*-mock.json` 저장 (예: `portfolio-summary-mock.json`)

#### 2-3. API 함수 생성/수정

**위치**: `apps/web/apis/{domain}/index.ts`

**작업 내용:**

1. `types.ts`에서 정의한 Req, Res 타입 import
2. API 함수 구현 (GET, POST, PATCH, DELETE 등)
3. `accessToken` 파라미터 지원 (SSR 호환)
4. `ApiResponse<T>` 래핑
5. 에러 처리 (`transformAxiosError` 사용)

**참고 패턴:**

- `apps/web/apis/events/events.ts` 참고
- `createRequestConfig(accessToken)` 사용
- JSDoc 주석 포함

#### 2-4. Tanstack Query Hooks 생성

**위치**: `apps/web/hooks/tanstack/use-{feature}-query.ts`

**작업 내용:**

1. `useQuery` 또는 `useMutation` hooks 생성
2. `useSession`으로 인증 토큰 가져오기
3. `queryKey` 정의 (캐시 키)
4. `queryClient.invalidateQueries`로 캐시 무효화 (mutation 성공 시)
5. `enabled` 옵션으로 조건부 실행
6. `staleTime` 설정 (필요 시)

**참고 패턴:**

- `apps/web/hooks/tanstack/use-portfolio-edit-sections-query.ts` 참고
- JSDoc 주석 포함
- `UseQueryResult`, `UseMutationResult` 타입 사용

**완료:** Types 생성 ✓ + 원칙 검증 ✓ + Mock 생성 ✓ + API 함수 생성 ✓ + Tanstack Query 생성 ✓ → 사용자 보고

### 3단계: 단일 작업 구현 (계획 → 구현 연속)

**흐름**: 계획 수립 → 즉시 구현 → 완료 보고 (중간 보고 없음)

#### 3-1. 계획

1. `pending` 첫 작업 선택 → `in_progress` 변경
2. Feature 파일 분석: 디자인 시스템 대체 가능 영역 + UX 개선점
3. 디자인 시스템 문서 참고하여 컴포넌트 선정
4. Mock data 활용 계획 구체화 (경로, 필드 명시)

#### 3-2. 구현

1. Feature 파일 수정
2. `apps/web/apis/{domain}/types.ts` 타입 import
3. Tanstack Query hooks import (`apps/web/hooks/tanstack/use-{feature}-query.ts`)
4. Mock data JSON import (필요 시)
5. 디자인 시스템 일관 적용
6. `read_lints` → 오류 수정
7. Todo → `completed`
8. **다음 AC 보고** (목적, 구현 기능)

**완료:** 계획 ✓ + 구현 ✓ + Lint ✓ → 사용자 보고 + 다음 AC 안내

### 4단계: 반복 루프 (3단계 반복 + PRD 동기화)

**루프 조건**: `pending` 작업 존재 여부

#### 작업 있음 → 반복

1. 3단계 실행 (계획 → 구현)
2. 사용자 보고 + 확인 대기
3. **사용자 변경 요청 시 PRD 동기화**:

- PRD 문서 수정 (AC, Flow, User Story)
- Todo 항목 추가/수정

4. 다음 반복

#### 모든 작업 완료 → 최종 검증

1. 최종 `read_lints` + 오류 해결
2. AC 체크리스트 검증 (누락 확인)
3. 사용자 보고 + 추가 변경 요청 수집
4. 변경 요청 있으면 PRD 반영 + 추가 작업

**완료:** 모든 Todo `completed` ✓ + Lint ✓ + AC 완료 ✓ + PRD 동기화 ✓ → 사용자 보고

### 5단계: PRD 검증 (Devil's Advocate)

**조건**: 4단계에서 PRD 수정된 경우 필수 실행

**검증 항목** (수정된 PRD 기준):

- ✅ 논리적 일관성 (모순/비약)
- ✅ 가정의 타당성 (현실성)
- ✅ 실행 가능성 (구현/리소스)
- ✅ 완전성 (누락 시나리오)

**완료:** 문제점 + 개선 제안 보고 → 사용자 결정에 따라 PRD 추가 수정

### 6단계: 최종 검증 및 완료

**최종 체크:**

- ✅ 모든 AC 충족
- ✅ 디자인 시스템 일관성
- ✅ Lint 오류 없음

**완료:** 최종 검증 ✓ → 사용자 완료 보고 + 피드백 수집

## 핵심 실행 규칙 요약

| 규칙                 | 내용                                                         |
| -------------------- | ------------------------------------------------------------ |
| **Types 우선**       | 2단계에서 Types → Mock data → API 함수 → Tanstack Query 순서 |
| **단계별 보고**      | 각 단계 완료 → 사용자 보고 → 확인 대기 → 다음 진행           |
| **반복 보고**        | 4단계 내 3단계 반복 시에도 매 반복마다 보고 + 확인           |
| **PRD 동기화**       | 사용자 변경 요청 즉시 PRD 반영                               |
| **Devil's Advocate** | PRD 수정 시 5단계 필수 실행                                  |

### ❌ 금지

- 여러 단계 동시 진행
- 여러 작업 동시 구현
- 확인 없이 다음 단계 진행
- 보고 생략
