## Overview

Playwright를 활용하여 UI 레벨에서 PRD 요구사항 충족 여부를 점검한다.

**목표**: PRD 분석 → QA Spec → QA 코드 → 실행 검증 → 요구사항 충족 여부 보고

**결과:**

- PRD와 코드 간 괴리 식별 및 정리
- 테스트 가능한 QA Spec 문서 생성
- Playwright 기반 QA 코드 구현
- 요구사항 충족 여부 검증 리포트

## Input

### 필수 파일 (미존재 시 작업 중단)

| 파일           | 경로 패턴                                               | 내용                       |
| -------------- | ------------------------------------------------------- | -------------------------- |
| Feature PRD    | `{project}/features/{epic-name}/{feature-name}.md`      | Goal, User Story, Flow, AC |
| Context        | `{project}/features/{epic-name}/{epic-name}-context.md` | 에픽 컨텍스트              |
| Feature 구현체 | `apps/web/` 하위 `{feature-name}` 관련 파일             | 검증 대상 UI 구현체        |

### 참고 문서

| 문서                                  | 용도               |
| ------------------------------------- | ------------------ |
| `pm/prompts/utils/devils-advocate.md` | PRD-코드 괴리 분석 |
| `pm/prompts/context/design-system.md` | UI 검증 기준 참조  |

## Output

**생성·수정 대상:**

- ✅ QA Spec 문서: `{project}/features/{epic-name}/{feature-name}.qa.md`
- ✅ QA 코드: `apps/web/test/{domain}/{feature}.tsx`

**품질 기준:**

- QA Spec이 PRD AC와 1:1 매핑
- 테스트 시나리오는 PRD User Flow 준수
- Playwright 테스트로 AC 검증 가능
- 실패 시 원인 추적 가능한 명확한 assertion
- **skip 사용 금지**: QA 시 `test.skip()`을 쓰지 않는다. 필수 env·조건이 없으면 skip하지 말고 `expect(..., '필수 env 누락: ...')` 등으로 테스트를 실패시키고, 사용자가 원인을 알 수 있게 한다.
- **API 사용 시**: req 에러를 에러 로그에 출력하기 위해, API 호출 후 반드시 `expect(res.ok(), \`Create API failed: ${res.status()} ${await res.text()}\`).toBeTruthy();` 형태로 status와 response body를 포함한 assertion 추가 (API 용도에 맞게 메시지 수정 가능)
- Lint 오류 없음
- 타임아웃: `apps/web/playwright.config.ts`의 `expect.timeout`이 3초(3000ms)로 설정되어 있어 assertion 기본 대기 시간이 적용된다. 필요 시 개별 assertion에 `{ timeout: N }`으로 오버라이드 (0.1~10초)
- 테스트 텍스트: 기본 영어 사용

## Step

**중요: 각 단계는 반드시 순차적으로 완료해야 한다. 한 번에 여러 단계를 진행하지 않는다. 각 단계 완료 후 중간 결과를 확인하고 다음 단계로 진행한다.**

### 🔒 실행 원칙 (모든 단계 공통)

1. **순차 실행**: 단계별 완료 후 다음 진행 (동시 진행 금지)
2. **단일 작업**: 한 번에 하나의 작업만 처리
3. **필수 보고**: 각 단계 완료 후 사용자 보고 + 확인 대기
4. **Todo 관리**: `todo_write`로 진행 상황 추적

### 1단계: Input 파일 분석 및 검증

**실행 규칙:**

- 이 단계만 먼저 완료한다. 다른 단계로 진행하지 않는다.
- 필수 파일과 참고 문서를 구분하여 분석한다.

**작업 내용:**

1. Feature PRD, Context, Feature 구현체 파일 존재 확인 및 읽기
2. PRD 요구사항(AC)과 실제 구현 코드 비교 분석
3. PRD에 명세되어 있으나 미구현 항목 식별
4. PRD에 명세되지 않았으나 구현된 항목 식별
5. Devil's Advocate 방법론 적용: PRD-코드 괴리 해소 방안 분석 및 사용자 제안

**완료 조건:**

- 필수 파일 존재 확인 및 분석 완료
- PRD-코드 괴리 항목 목록화 완료
- 괴리 해소 제안 작성 완료
- 사용자 보고 및 확인 대기

### 2단계: QA Spec 생성 및 업데이트

**실행 규칙:**

- 1단계가 완료된 후에만 시작한다.
- PRD-코드 괴리가 해소된 상태에서 진행한다. 미해소 시 사용자 확인 후 진행 여부 결정한다.

**작업 내용:**

1. PRD AC 및 User Flow 기준으로 테스트 시나리오 정의 (User Flow 준수 필수)
2. `{project}/features/{epic-name}/{feature-name}.qa.md` 생성 또는 업데이트
3. 각 AC에 대응하는 테스트 케이스 명시 (Given-When-Then 형태)
4. 엣지 케이스 및 예외 시나리오 포함
5. 참고한 Feature PRD(`{epic-name}/{feature-name}.md`)에 QA Spec 경로(`{feature-name}.qa.md`)를 명시한다. (예: 문서 상단 또는 관련 섹션에 `> 📋 **QA Spec**: [feature-name.qa.md](./feature-name.qa.md)` 등으로 링크 추가.)
6. QA Spec 상단 블록(인용)에 **Playwright Report** 링크 영역을 둔다. (실제 경로는 4단계 실행 후 채움.)

**완료 조건:**

- QA Spec 문서 생성 또는 업데이트 완료
- AC별 테스트 케이스 매핑 완료
- 참고한 Feature PRD에 QA Spec 경로 반영 완료
- 사용자 보고 및 확인 대기

### 3단계: QA 코드 작성

**실행 규칙:**

- 2단계가 완료된 후에만 시작한다.
- QA Spec에 정의된 테스트 케이스만 구현한다.

**작업 내용:**

1. `apps/web/test/{domain}/{feature}.tsx` 생성 또는 수정
2. Playwright API로 QA Spec의 각 테스트 케이스 구현
3. selector, assertion, error 메시지를 명확히 작성. **skip 사용 금지**: 필수 env 등이 없으면 `test.skip()` 대신 expect로 실패시켜 사용자에게 원인을 알린다.
4. **API 호출 시 필수**: `expect(res.ok(), \`Create API failed: ${res.status()} ${await res.text()}\`).toBeTruthy();` 형태로 status와 response body를 에러 로그에 출력 (API 용도에 맞게 메시지 수정 가능)
5. 타임아웃: `playwright.config.ts`의 `expect.timeout`(3초)이 기본 적용됨. 더 길거나 짧은 대기가 필요한 assertion·액션에만 `{ timeout: N }` 명시 (0.1~10초)
6. 테스트용 텍스트는 기본 영어 사용
7. `read_lints` 실행 후 오류 수정

**완료 조건:**

- QA 코드 생성 또는 수정 완료
- Lint 오류 없음
- 사용자 보고 및 확인 대기

### 4단계: QA 실행 및 결과 수집

**실행 규칙:**

- 3단계가 완료된 후에만 시작한다.
- 생성한 QA 코드를 실제 환경에서 실행한다.
- 루트에서 실행한다. `apps/web`에서 실행하는 것 아님.

**작업 내용:**

1. Playwright 테스트 실행 (`pnpm test:e2e` 실행). 결과는 시스템 임시 디렉터리에 쌓인다. HTML report는 실행 후 터미널에 찍히는 경로로 열거나 `pnpm exec playwright show-report` 로 연다.
2. 실패한 테스트 케이스 원인 분석
3. 통과/실패 결과 목록화
4. AC별 충족 여부 매핑
5. QA Spec 문서(`{project}/features/{epic-name}/{feature-name}.qa.md`) 상단에 "HTML report: 실행 후 `pnpm exec playwright show-report` 또는 터미널에 출력된 경로로 열기" 정도만 기재한다.

**완료 조건:**

- QA 실행 완료
- 결과 목록 및 AC 매핑 완료
- QA Spec에 HTML report 열기 안내 반영 완료
- 사용자 보고 및 확인 대기

### 5단계: 요구사항 충족 여부 검토 및 보고

**실행 규칙:**

- 4단계가 완료된 후에만 시작한다.
- 최종 결과만 정리하여 제공한다.

**작업 내용:**

1. AC별 충족 여부 요약
2. 미충족 AC 목록 및 원인 정리
3. 사용자에게 검토 결과 제공 및 피드백 수집

**완료 조건:**

- 요구사항 충족 여부 검토 완료
- 사용자에게 결과 제공 및 피드백 요청 완료

## 실행 원칙

### 단계별 진행 규칙

1. **순차 실행**: 각 단계는 반드시 이전 단계가 완료된 후에만 시작한다.
2. **단계별 완료**: 각 단계는 완료 조건을 충족한 후에만 다음 단계로 진행한다.
3. **중간 확인**: 각 단계 완료 후 사용자 보고 및 확인을 기다린다.
4. **Todo 추적**: `todo_write`로 각 단계 진행 상황을 관리한다.

### 금지 사항

- 한 번에 여러 단계를 동시에 진행하지 않는다.
- 단계 완료 전에 다음 단계로 진행하지 않는다.
- 필수 파일 확인 없이 작업을 진행하지 않는다.
- PRD-코드 괴리 미해소 상태에서 QA Spec 작성하지 않는다 (사용자 결정 예외).
