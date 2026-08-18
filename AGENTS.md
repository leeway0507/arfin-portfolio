# 1. 프로젝트 구조

사진작가 포트폴리오와 관리자 페이지로 구성된 Next.js 15 프로젝트다. 프런트엔드는 정적 빌드하고, 서버 기능은 Cloudflare Pages Functions와 R2를 사용한다. 관리자 인증은 Firebase가 담당한다.

- `app/`: Next.js App Router 화면. `/` 홈, `/photographs` 갤러리, `/admin` 관리자 화면이 있다.
- `components/`: 공용 UI. 내비게이션, 홈, 캐러셀, 기본 UI 컴포넌트로 나뉜다.
- `hooks/`: 공용 React 훅. 현재 관리자 인증 훅을 포함한다.
- `lib/`: 프런트엔드 API 클라이언트, Firebase 인증, 이미지 압축, 공용 유틸리티가 있다.
- `functions/`: Cloudflare Pages 서버 코드. `api/`는 엔드포인트, `lib/`는 인증과 R2 저장 로직이며 `_middleware.ts`는 CORS를 처리한다.
- `prd/`: 기능 요구사항, 설계 배경, 진행 기록, 작업용 프롬프트가 있다.
- `public/`: 정적 이미지 등 공개 자산이 있다.
- `package.json`, `next.config.ts`, `wrangler.jsonc`: 실행 명령과 Next.js·Cloudflare 설정이다.
- `.next/`, `out/`, `.wrangler/`, `.swc/`: 빌드 또는 로컬 실행 생성물이므로 직접 수정하지 않는다.

새 세션에서는 이 구조를 기준으로 필요한 범위만 추가 탐색한다. 특히 `app/`과 `functions/`는 서로 다른 런타임이라는 점을 유지한다.

# 2. 사용자 커뮤니케이션

1. 모르는 내용은 추측으로 단정하지 말고, 모른다고 명확히 말한다.
2. 사용자의 의견에 무조건 동의하지 않는다. 사실과 논리에 어긋나거나 비합리적이면 근거를 들어 적극적으로 반박하고 더 나은 방향을 제안한다.
3. 답변은 결론과 핵심 근거 중심으로 간결하게 작성한다. 반복, 장황한 설명, 맥락 없는 정보는 제외한다.
4. 의도가 불명확하거나 해석에 따라 결과가 달라지면, 이해한 내용을 자신의 언어로 요약해 설명하고 사용자에게 확인한다.

# 3. 프론트엔드 코드 작성 지침

## 목표와 적용 범위

프론트엔드 코드의 최우선 기준은 **위에서 아래로 한 번에 읽히는 구조**다. 파일 상단의 진입 함수만 읽어도 화면의 큰 구조와 데이터 흐름을 파악할 수 있어야 한다.

이 지침은 새로 작성하거나 직접 수정하는 페이지·모달·카드 등 **도메인 컴포넌트**에 적용한다. 특정 도메인과 무관하게 재사용되는 공용 컴포넌트와 UI primitive에는 아래의 세부 구조·네이밍·props 규칙을 강제하지 않는다. 요청과 관계없는 기존 파일까지 리팩터링하지 않되, 직접 수정하는 범위에서 발견한 코드 스멜은 함께 개선한다.

## 작업 방식

1. 전체 작업에서 가장 작은 의미 단위를 식별한다.
2. 해당 단위의 구현과 검증 방법만 짧게 계획한다.
3. 한 단위씩 구현하고 테스트한 뒤 다음 단위로 넘어간다.
4. 구현이 끝나면 독립 서브에이전트가 변경 diff를 이 지침과 아래 체크리스트로 검토한다. 서브에이전트는 코드를 직접 수정하지 않는다.
5. 메인 에이전트가 유효한 지적을 반영하고 다시 검증한다.

변경 규모가 크거나 설계 선택이 필요한 작업은 구현 전 계획도 서브에이전트에게 검토받는다. 컴포넌트는 줄 수를 줄이기 위해 쪼개지 않고, 독립적으로 이름 붙일 수 있는 화면 영역이나 하나의 책임이 있을 때 분리한다.

## 파일 구조

컴포넌트 파일은 다음 순서로 배치한다.

1. `import`
2. `type` / `interface`
3. **export 진입 함수**
4. 진입 JSX에 등장하는 순서대로 하위 UI 함수
5. DOM을 만들지 않는 순수 helper

export 진입 함수는 화면 조합, 데이터 주입, 로컬 UI 상태와 얇은 이벤트 핸들러만 담당한다. 세부 마크업은 하위 UI 함수로, 필터·포맷 같은 순수 로직은 helper로 내려서 진입 JSX가 화면의 목차처럼 읽히게 한다.

```tsx
import ...

interface BuildMemberAddModalProps { ... }

export function BuildMemberAddModal(props: BuildMemberAddModalProps) {
  const [search, setSearch] = ...;
  const addableMembers = ...;

  const handleAddMembersToBuild = () => ...;

  return (
    <BuildMemberAddModalShell>
      <BuildMemberAddModalTitleBar onClose={props.onClose} />
      <BuildMemberAddModalSearch search={search} onChangeSearch={setSearch} />
      <BuildMemberAddModalMemberList addableMembers={addableMembers} />
      <BuildMemberAddModalActions onAddMembersToBuild={handleAddMembersToBuild} />
    </BuildMemberAddModalShell>
  );
}

function BuildMemberAddModalShell(...) { ... }
function BuildMemberAddModalTitleBar(...) { ... }
function BuildMemberAddModalSearch(...) { ... }
function BuildMemberAddModalMemberList(...) { ... }
function BuildMemberAddModalActions(...) { ... }

function filterAddableMembers(...) { ... }
```

## 네이밍

- 도메인 하위 함수는 **도메인 + 역할**로 짓는다. 예: `BuildMemberAddModalSearch`, `BuildMemberAddModalMemberRow`.
- 레이아웃 껍데기는 무엇을 감싸는지 드러나는 `…Shell`, `…Frame` 등의 이름을 쓴다.
- 구분선이나 패딩 래퍼처럼 도메인과 무관한 파일 내부 UI 구조는 `FieldSeparator`처럼 짧게 짓는다. 파일 맥락으로 충분한 이름에 도메인 접두사를 반복하지 않는다.
- 도메인 props와 콜백은 데이터의 용도와 행위가 드러나게 짓는다. `members`, `onSelect`보다 `addableMembers`, `onAddMembersToBuild`를 사용한다.
- 이름만으로 용도를 명확히 표현하기 어렵다면 핵심 의도만 짧게 주석으로 남긴다.

## props와 상태

- 도메인 하위 컴포넌트의 고정된 `title`, `label`, `placeholder` 같은 UI 문구는 해당 컴포넌트 안에 둔다. 이를 외부에서 props로 주입해 API를 불필요하게 늘리지 않는다.
- 서버 응답, 사용자 입력, 상태에 따라 바뀌는 콘텐츠는 문구가 아니라 데이터이므로 props로 전달할 수 있다.
- 진입 함수에서 하위 함수로 전달하는 props는 데이터·상태·콜백 중심으로 제한한다.
- JSX prop 안에 긴 함수나 복잡한 조건을 작성하지 않는다. 의미 있는 변수나 도메인 행위를 나타내는 핸들러로 먼저 정의한다.
- 상태는 실제 소비자들의 가장 가까운 공통 부모가 소유한다. 단순히 props 전달을 피하려고 모든 상태를 Provider에 넣지 않는다. Provider는 여러 화면이나 깊은 트리에서 실제로 공유하는 상태에만 사용한다.

## 함수 내부 구조와 helper

- 같은 기능이나 UI 영역을 위한 상태·파생값·이벤트 핸들러·effect를 인접하게 배치하고, 관련 없는 그룹은 빈 줄로 구분한다.
- 그룹의 의도가 이름만으로 드러나지 않을 때만 짧은 주석을 사용한다.
- helper는 이름이 로직의 의도를 설명하거나 재사용·테스트 가치가 있을 때만 추출한다.
- 단순히 한 줄을 감싸거나 호출부에서 실제 로직을 숨기는 helper는 만들지 않는다.

## 검토 체크리스트

- export 진입 JSX만 읽어도 화면의 큰 구조가 보이는가?
- `import` → `type` / `interface` → export 진입 함수 순서를 지켰는가?
- 하위 UI 함수가 진입 JSX와 같은 순서로 배치됐는가?
- 컴포넌트와 props 이름에서 도메인 역할과 행위가 드러나는가?
- 고정 UI 문구를 불필요하게 props로 전달하지 않았는가?
- JSX prop 안에 긴 콜백이나 복잡한 조건이 숨어 있지 않은가?
- 같은 기능이나 UI 영역의 선언이 서로 인접하게 배치됐는가?
- 상태가 가장 가까운 공통 부모에 있으며, 불필요한 prop drilling이나 거대한 Provider가 없는가?
- 컴포넌트와 helper가 의미 있는 책임 단위로 나뉘었으며 과도하게 분리되지 않았는가?
