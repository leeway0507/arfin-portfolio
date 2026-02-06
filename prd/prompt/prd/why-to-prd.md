# Why 문서에서 PRD 생성

## Overview

Why 문서를 분석하여 PRD를 직접 생성한다. Why 문서와 사용자 여정에서 **에픽 구조**를 추출하고, 각 에픽의 추상적 사용자 행동(Core User Actions)을 구체적 Feature로 전환하여 시나리오 컨텍스트가 포함된 PRD를 작성한다.

### 결과물

- 에픽별 컨텍스트 문서 (목적, 상황, 전환점 등 시나리오 정보 포함)
- 각 기능의 상세 PRD 문서 (시나리오 컨텍스트 참조)
- 논리 검증과 문장 교정을 거친 완성된 PRD
- 진행 상황 추적 문서 (progress.md)

## Input

### 필수 입력

- **Why 문서**: 기능이 필요한 이유를 설명한 문서
  - 경로 예시: `vision/articles/startup-directory/0.why.md`
  - 타겟 페르소나, 문제, 솔루션 포함
  - **선택**: `## 초기 에픽 가설`(또는 `## Key capability areas`) 섹션에 3~5개 역량/영역을 나열해 두면, 1단계 에픽 도출 시 참조·교차 검증에 활용한다. 상세는 워크플로우에서 도출한다.

### 참고 문서

- `utils/devils-advocate.md`: 논리 검증 방법론
- `utils/writing-editor.md`: 문장 교정 가이드
- `templates/epic-context-template.md`: 에픽 컨텍스트 템플릿
- `templates/feature-prd-template.md`: Feature PRD 템플릿
- `templates/progress-template.md`: 진행 상황 추적 템플릿
- `guides/context-quality-guide.md`: Context 작성 품질 가이드

## Output

### 파일 생성 규칙

- **에픽 폴더**: `../features/{N}-{epic-name}/`
  - N: 에픽 순서(0부터)
  - epic-name: 에픽 제목을 kebab-case로 변환, 2~4 단어, 영어 권장 (예: `1-portfolio-dashboard`, `2-portfolio-creation`)
- **공통 컨텍스트**: `../features/{N}-{epic-name}/{N}-{epic-name}-context.md`
- **Feature 파일**: `../features/{N}-{epic-name}/{N-X-feature-name}.md`
  - X: Feature 번호
  - feature-name: Feature 명을 kebab-case로 변환 (예: `1-1-portfolio-overview.md`)
- **진행 상황**: `../features/progress.md`

### 템플릿 참조

문서 구조는 다음 템플릿을 따른다:
- 에픽 컨텍스트: `templates/epic-context-template.md` 참조
- Feature PRD: `templates/feature-prd-template.md` 참조
- 진행 상황 추적: `templates/progress-template.md` 참조

### 품질 기준

- 각 feature는 독립적으로 구현 가능한 수준의 구체성을 갖는다
- User Story에서 persona, action, benefit이 명확히 구분된다
- Acceptance Criteria는 테스트 가능한 조건으로 작성한다
- Scenario Context는 해당 feature의 배경을 명확히 이해할 수 있도록 작성한다
- Context 작성 시 `guides/context-quality-guide.md`의 품질 기준을 준수한다

## Progress Tracking

### 파일 관리

- 워크플로우 시작 시 `../features/progress.md` 파일을 생성한다
- 각 Checkpoint 통과 후 진행 상황을 업데이트한다
- 사용자가 작업을 중단하고 나중에 재개할 수 있도록 명확한 상태를 기록한다

### 작업 재개

중단된 작업을 재개할 때:
1. `progress.md` 파일을 읽어 현재 상태를 파악한다
2. "Current Stage"를 확인하여 어느 단계인지 파악한다
3. "In Progress" 항목이 있으면 해당 작업부터 재개한다
4. "Pending" 항목들을 순차적으로 진행한다

### 상태 아이콘

- ✅ 완료/승인됨
- 🔄 진행 중/검토 중
- ⏸️ 대기 중

### Progress 업데이트 시점

각 단계에서 progress.md를 다음과 같이 업데이트한다:

| 단계 | 업데이트 내용 |
|------|--------------|
| 1-1 (시작) | progress.md 생성, Stage="Epic Structure", Next Actions 명시 |
| 1-4 (Checkpoint 1) | Epic Structure Status="✅", Stage="Context Creation", Next Actions="Create context for Epic 0" |
| 2-1 (Context 생성) | 각 에픽 Context Status="✅", Next Actions에 다음 작업 명시 |
| 2-1 (모든 Context 완료) | Stage="Feature Development", Next Actions="Write PRD for first feature" |
| 3-1 (PRD 작성 시작) | Feature="🔄 In Progress", Next Actions="Complete PRD and get approval" |
| 3-4 (Checkpoint) | Feature="✅ Approved", Completed Features 증가, Completed Date 기록 |
| 3-5 (다음 결정) | Next Actions=다음 feature 또는 다음 에픽 또는 최종 검증 |
| 4-4 (완료) | Stage="Complete", Next Actions에 완료 요약 |

## Workflow

### 전체 프로세스 개요

1. **Why 문서 분석** → 에픽 구조 추출 → 사용자 승인
2. **Context 생성** → 각 에픽별 context 파일 생성 (추상적 Core User Actions 포함)
3. **Feature PRD 작성 (반복)**:
   - Core User Action을 구체적 Feature로 전환 + PRD 작성 (초안 → 논리검증 → 교정)
   - 필요 시 에픽 Context 보완
   - 완성된 PRD 사용자 승인 (Checkpoint)
4. **최종 검증 (AI 자동)** → Context-PRD 정합성 확인 → 완료 보고

**에픽–화면 관계**: 본 워크플로우는 1 에픽 = 1 주 진입점(화면)을 가정한다. 1 에픽:N 화면 또는 N 에픽:1 화면이 필요하면, 에픽–화면 매핑 절을 별도로 설계한다.

---

### 1단계: Why 문서 분석 및 에픽 구조 추출

#### 1-1. Why 문서 분석 및 Progress 초기화

Why 문서에서 다음 정보를 추출한다:
- 타겟 페르소나 (Target Persona)
- 해결하려는 문제 (Problem)
- 제안하는 솔루션 (Solution)
- 핵심 가치 제안 (Value Proposition)
- **선택**: `## 초기 에픽 가설`(또는 유사) 섹션이 있으면 참조하여, 1-2 에픽 도출 시 반영·교차 검증한다.

`progress.md` 생성 (템플릿: `templates/progress-template.md`):
- Project: Why 문서에서 추출한 프로젝트 이름
- Started: 현재 날짜
- Current Stage: "Epic Structure"
- Epic Structure Status: "🔄 In Review"
- Next Actions: "Analyze user journey and derive epic structure"
- Current Focus: "Epic structure extraction"

#### 1-2. 에픽 구조 도출

- 사용자 여정을 분석하여 논리적 단계를 식별한다
- 각 단계를 **에픽** 단위로 정의한다 (Epic 0: 진입점, Epic 1~N: 각 단계)
- 각 에픽의 목적을 한 문장으로 요약한다
- **에픽 폴더명(epic-name) 도출**: 에픽 제목을 kebab-case로 변환한다. 2~4 단어, 영어 권장 (예: `portfolio-dashboard`, `portfolio-creation`). 1-4 승인 시 확정한다.

#### 1-3. 에픽 목록 제시

```markdown
## 추출된 에픽 구조

| N | epic-name (폴더명) | 제목 | 목적 |
|---|-------------------|------|------|
| 0 | [epic-name] | [제목] | [목적] |
| 1 | [epic-name] | [제목] | [목적] |
| N | [epic-name] | [목적] |
```

#### 1-4. 사용자 승인 (Checkpoint 1)

- 추출한 에픽 구조(목록·epic-name 포함)를 사용자에게 제시한다
- **반드시 사용자 승인을 받은 후에만 다음 단계로 진행한다**
- 승인 후 progress.md 업데이트:
  - Epic Structure Status="✅ Approved", Approved Date 기록
  - Current Stage="Context Creation"
  - Total Epics 업데이트
  - Next Actions="Create context for Epic 0" (또는 첫 번째 에픽)
  - Current Focus=첫 번째 Context 파일

### 2단계: Context 파일 생성

#### 2-1. 에픽별 Context 파일 생성

승인된 각 에픽에 대해 **폴더** `{N}-{epic-name}` 및 **Context 파일**을 생성하고 내용을 작성한다.

**파일 생성**:
- 폴더: `../features/{N}-{epic-name}/`
- 경로: `../features/{N}-{epic-name}/{N}-{epic-name}-context.md`
- 템플릿: `templates/epic-context-template.md`

**작성 가이드**: `guides/context-quality-guide.md` 참조

작성 항목과 품질 기준은 Context Quality Guide를 따른다:
- Context, Purpose, User Situation, Core User Actions, Transitions
- Core User Actions는 추상적 수준으로 작성 (Feature PRD에서 구체화)
- Context는 Feature PRD 작성을 통해 점진적으로 구체화됨

**Progress 업데이트**:

각 Context 파일 생성 및 저장 후 progress.md를 즉시 업데이트한다:

1. **현재 에픽 완료 표시**:
   - 해당 에픽 Context Status="✅ Created"
   - Created Date 기록

2. **다음 작업 명시**:
   - Next Actions에 다음에 할 작업 추가:
     - 남은 Context 파일이 있으면: "Create context for Epic {N+1} (`{N+1}-{epic-name}`)"
     - 모든 Context 완료 시: "Write PRD for first feature from Epic 0"
   - Current Focus 업데이트

3. **단계 전환** (모든 Context 파일 생성 완료 시):
   - Current Stage="Feature Development"
   - Next Actions="Write PRD for first feature from Epic 0"
   - Current Focus="Epic 0"

### 3단계: Feature PRD 작성 (순차적 반복)

각 에픽의 Core User Actions를 구체적 Feature로 전환하고 PRD를 작성한다. 각 Feature PRD를 완성하여 사용자 승인을 받은 후 다음 Feature로 진행한다.

#### 3-1. Feature 정의 및 PRD 초안 작성

현재 에픽의 Core User Actions 중 **하나를 선택**하여 구체적 Feature로 정의하고 PRD 초안을 작성한다.

**Feature 정의 기준**:
- **단일 사용자 목표**: 하나의 명확한 사용자 목표를 달성하는 최소 기능 단위
- **독립 실행 가능**: 해당 기능만으로도 테스트하고 배포할 수 있음
- **행동 통합**: 동일한 데이터나 화면 요소를 다루는 여러 행동은 하나의 Feature로 통합

**우선순위 판단**:
- **필수 (Required)**: 에픽 핵심 목적에 직접 연결
- **선택 (Optional)**: 에픽 목적을 보완

**PRD 작성**: 템플릿 `templates/feature-prd-template.md`에 따라 작성

**Feature 제목 및 개요**:
- Feature N-X [필수/선택]: [Feature 명] - [한 줄 설명]
- 파일명: `{N-X-feature-name}.md` (Feature 명을 kebab-case로 변환)

**Scenario Context**: 에픽 context 파일 참조
- 경로 명시: `See ./{N}-{epic-name}-context.md` (동일 에픽 폴더 내)
- 필요 시 에픽 Context 보완 (Core User Actions 추가, User Situation 구체화 등)

**User Story**: As a [persona] I want to [action], so that [benefit]
- Persona: Why 문서의 Target Persona
- Action: Feature의 핵심 행동
- Benefit: 사용자가 얻는 가치

**Acceptance Criteria**: 테스트 가능한 조건 ("사용자가 X를 할 수 있다")

**User Flow**: 사용자 행동 → 시스템 반응 형식

**UI State**: Empty, Loading, Error 상태 모두 포함

Progress 업데이트:
- Current Stage="Feature Development"
- Current Focus="Epic N - Feature N-X"
- Feature 목록에 추가: "Feature N-X: [이름] - 🔄 In Progress"
- Next Actions="Apply Devil's Advocate review, Writing Editor corrections, and get user approval"

#### 3-2. 논리 검증 (Devil's Advocate)

`devils-advocate.md` 방법론 적용:
- 논리적 일관성, 가정의 타당성, 실행 가능성, 완전성 검토
- 문제점 발견 및 개선 방안 제시
- Feature 명세 수정

#### 3-3. 문장 교정 (Writing Editor)

`writing-editor.md` 가이드 적용:
- 명확성: 모호한 표현 → 구체적 표현
- 간결성: 불필요한 중복 제거
- 자연스러움: 한국어 표현 다듬기
- 일관성: 용어와 형식 통일

#### 3-4. 파일 저장 및 사용자 승인 (Checkpoint)

- Feature PRD를 `../features/{N}-{epic-name}/{N-X-feature-name}.md`로 저장한다
  - 파일명 예시: `1-1-portfolio-overview.md`, `2-3-company-search.md`
- 사용자에게 파일 검토를 요청한다
- **반드시 사용자 승인을 받은 후에만 다음 단계로 진행한다**
- 수정 요청 시 3-2부터 3-3 반복

Progress 업데이트 (승인 후):
- 완료 feature="✅ Approved", Completed Date 기록
- Completed Features 카운트 증가

#### 3-5. 다음 Feature 결정

현재 에픽에서 정의할 Feature가 더 있는지 판단한다.

**Feature 추출 완료 판단 기준**:
- ✅ 모든 Core User Actions가 최소 하나의 Feature에 포함됨
- ✅ 에픽 Purpose 달성에 필요한 기능이 모두 정의됨
- ✅ 추가 Feature 없이도 사용자가 에픽 목표를 달성할 수 있음

**같은 에픽에 Feature가 더 있는 경우**:
- Next Actions="Write PRD for next feature from Epic N"
- Current Focus="Epic N - Next feature"
- **3-1로 돌아가서 다음 Feature PRD 작성**

**현재 에픽 완료, 다음 에픽이 있는 경우**:
- 현재 에픽 Status="✅ All features completed"
- Next Actions="Write PRD for first feature from Epic {N+1}"
- Current Focus="Epic {N+1}"
- **3-1로 돌아가서 다음 에픽의 첫 Feature PRD 작성**

**모든 에픽의 모든 Feature 완료**:
- Stage="Final Verification"
- Next Actions="Perform final verification"
- **4단계로 진행**

### 4단계: 전체 검증 및 완료

모든 Feature PRD 작성이 완료되면 전체 일관성을 검증한다. AI가 자동 검증을 수행하고 결과를 보고하며, 문제 발견 시 사용자에게 확인을 요청한다.

#### 4-1. 최종 점검 (AI 수행)

**PRD 구조 및 일관성**:
- 모든 feature가 PRD 템플릿 구조 준수
- Feature 간 일관성 유지
- 각 Feature PRD가 참조하는 에픽 context 파일과 정합성 확인
- 누락된 UI State나 Acceptance Criteria 점검

**Context 품질**: `guides/context-quality-guide.md`의 체크리스트 적용
- Context-Feature 일관성 확인
- Core User Actions의 Feature 전환 완료 확인

**검증 결과**: 문제 없음 → 4-2 진행, 문제 발견 → 사용자에게 보고 및 수정 제안

#### 4-2. Feature 간 의존성 확인 (AI 수행, 사용자 확인)

- Feature 간 의존성과 순서가 논리적으로 연결되는지 확인
- 의존 관계가 필요하지만 명시되지 않은 경우 발견
- **발견 시 조치**: 사용자에게 의존성 목록 제시하고 명시 여부 확인 요청

#### 4-3. Why 문서와의 정합성 검증 (AI 수행)

- 모든 feature가 Why 문서의 핵심 문제를 해결하는지 확인
- Why 문서의 가치 제안이 feature에 반영되어 있는지 검토
- 누락된 핵심 기능 점검

**검증 결과**: 문제 없음 → 4-4 진행, 문제 발견 → 사용자에게 보고 및 보완 제안

#### 4-4. 완료 보고 (AI 수행)

모든 검증이 완료되면 최종 결과를 사용자에게 보고한다:

- 생성된 모든 파일 목록 제시
- 에픽별 feature 수와 우선순위 분포 요약
- Why 문서에서 PRD까지의 변환 완료 알림
- 발견된 주요 의존성이나 주의사항 요약

Progress 최종 업데이트:
- Stage="Complete"
- Completed Date 기록
- Next Actions="All PRDs completed. Ready for implementation planning."
- Notes에 완료 요약 추가:
  - 생성된 총 에픽 수
  - 생성된 총 feature 수
  - 필수/선택 feature 분포
  - 특이사항

## 주의사항

### 승인 프로세스

- 각 Checkpoint에서 반드시 사용자 승인 필요
- 승인 없이 다음 단계로 진행하지 않음
- 수정 요청 시 해당 단계부터 재진행

**Checkpoint 목록**:
1. **Checkpoint 1 (1-4)**: 에픽 구조 승인
2. **Checkpoint (3-4)**: 각 Feature PRD 승인 (반복)
3. 각 Feature마다 완성된 PRD 하나로 승인 절차 진행

### 파일 관리

- 에픽 폴더: 에픽당 1개 (`{N}-{epic-name}/`)
- 공통 컨텍스트 파일: 에픽당 1개 (`{N}-{epic-name}-context.md`)
- Feature PRD 파일: feature당 1개 (`{N-X-feature-name}.md`)
- 파일명 규칙:
  - 폴더: `{N}-{epic-name}/` (kebab-case, 2~4 단어, 영어 권장)
  - Context: `{N}-{epic-name}-context.md`
  - Feature: `{N-X-feature-name}.md` (kebab-case)
  - 예시: `1-portfolio-dashboard/`, `1-portfolio-dashboard-context.md`, `1-1-portfolio-overview.md`

**에픽명(epic-name) 변경 시**: 폴더명·Context 파일명 변경, progress.md 및 해당 에픽을 참조하는 Feature PRD의 Context 경로를 함께 수정한다.

### 품질 관리

- Devil's Advocate 검증 모든 feature 적용
- Writing Editor 교정 모든 feature 적용
- Feature PRD는 에픽 context 파일을 참조하여 일관성 유지
- 에픽 Context 수정 시 관련된 모든 Feature PRD와의 정합성 확인 필요

### 시나리오 컨텍스트 임베딩

- User Scenario를 별도 파일로 생성하지 않음
- 시나리오 정보는 공통 컨텍스트와 각 feature PRD에 임베드
- 시나리오 정보는 내부적으로만 생성하고 활용

**Context-PRD 링크 관계**:
- Feature PRD는 에픽 context 파일을 참조 (복사 아님)
- PRD 작성 중 Context 보완 필요 시 → Context 파일 업데이트
- Context는 PRD 작성을 통해 점진적으로 구체화
- Context 수정 시 관련 모든 PRD와의 일관성 확인 필요

### Feature 정의 방식

**진행 방식**:
- 모든 Feature 목록을 미리 추출하지 않음
- Core User Action을 하나씩 선택하여 구체적 Feature로 전환
- Feature 정의와 PRD를 분리하지 않고 통합된 문서로 작성
- 완성된 PRD 하나로 사용자 검토 후 다음 Feature로 진행

**Core User Action → Feature 전환**:
- Context: 추상적 행동 (예: "투자 이력 확인")
- Feature: 구체적 기능 (예: "포트폴리오 목록 카드 뷰")
- 1:N 또는 N:1 매핑 가능
- 필요 시 에픽 Context의 Core User Actions 추가/수정 가능
