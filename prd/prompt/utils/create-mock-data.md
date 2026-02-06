## Overview

TypeScript 타입 정의 파일을 분석하여 faker.js 기반 mock data generator를 생성한다. 타입 변경 시 프롬프트를 재실행하여 generator를 재생성한다. 생성된 파일은 `.mjs` 확장자를 사용하는 ES Module 형식이다.

- 타입 정의 파일에서 필드 타입과 구조를 추출한다.
- faker.js를 활용하여 각 필드에 적합한 mock data 생성 로직을 작성한다.
- 타입과 동일한 구조의 mock data를 반환하는 함수를 생성한다.
- `.mjs` 파일 형식으로 ES Module을 사용하여 생성한다.

## Input

### 필수 문서

- **타입 정의 파일**: TypeScript 타입이 정의된 파일 경로 (예: `types.ts`)
  - 파일이 존재하지 않으면 작업을 중단하고 사용자에게 알린다.
  - interface 또는 type 선언이 포함되어야 한다.

### 참고 문서

- 없음

## Output

- **mock-generator.mjs**: 입력 파일과 동일한 디렉토리에 생성되는 mock data generator
  - `.mjs` 확장자를 사용하는 ES Module 형식으로 생성된다.
  - faker.js를 import하여 각 필드 타입에 맞는 데이터를 생성한다.
  - 입력 타입과 동일한 구조의 객체 또는 배열을 반환하는 함수를 제공한다.
  - 생성된 코드는 TypeScript 타입 체크를 통과해야 한다.
  - 타입 변경 시 프롬프트 재실행으로 재생성된다.

## Step

**중요: 각 단계는 반드시 순차적으로 완료해야 한다. 한 번에 여러 단계를 진행하지 않는다. 각 단계 완료 후 중간 결과를 확인하고 다음 단계로 진행한다.**

### 1단계: 타입 정의 파일 분석

**실행 규칙:**

- 이 단계만 먼저 완료한다. 다른 단계로 진행하지 않는다.
- 파일이 존재하지 않으면 작업을 중단하고 사용자에게 알린다.

**작업 내용:**

- 제공된 경로의 타입 정의 파일을 읽는다.
- interface 또는 type 선언을 추출한다.
- 각 타입의 필드명, 필드 타입, 옵셔널 여부를 파싱한다.
- 중첩된 타입이나 배열 타입을 식별한다.
- 다음 특수 타입을 처리할 수 있는지 확인한다:
  - union 타입 (예: `string | number`)
  - enum 타입
  - literal 타입 (예: `'active' | 'inactive'`)
  - generic 타입 (예: `Array<T>`, `Promise<T>`)
  - tuple 타입 (예: `[string, number]`)

**완료 조건:**

- 타입 정의 파일 읽기 완료
- 모든 타입 선언 추출 완료
- 필드별 타입 정보 파싱 완료
- 특수 타입 처리 가능 여부 확인 완료

### 2단계: faker.js 매핑 로직 생성

**실행 규칙:**

- 1단계가 완료된 후에만 시작한다.
- 이 단계만 먼저 완료한다. 다른 단계로 진행하지 않는다.

**작업 내용:**

- faker.js 버전을 확인한다 (`@faker-js/faker` v8+ 사용 권장).
- 각 TypeScript 타입을 적절한 faker.js 메서드로 매핑한다.
  - `string` → `faker.lorem.word()` (기본값)
  - `number` → `faker.number.int()`
  - `boolean` → `faker.datatype.boolean()`
  - `Date` → `faker.date.recent()`
  - 배열 타입 → `Array.from({ length: 5 }, () => ...)` 형태로 생성 (기본 5개)
  - 중첩 객체 → 재귀적으로 함수 호출
- 필드명을 분석하여 더 적합한 faker 메서드를 선택한다:
  - `name`, `userName`, `fullName` → `faker.person.fullName()`
  - `firstName` → `faker.person.firstName()`
  - `lastName` → `faker.person.lastName()`
  - `email` → `faker.internet.email()`
  - `phone`, `phoneNumber` → `faker.phone.number()`
  - `address` → `faker.location.streetAddress()`
  - `city` → `faker.location.city()`
  - `country` → `faker.location.country()`
  - `url`, `website` → `faker.internet.url()`
  - `title` → `faker.lorem.sentence()`
  - `description`, `content` → `faker.lorem.paragraph()`
  - `age` → `faker.number.int({ min: 18, max: 80 })`
  - `price`, `amount` → `faker.number.float({ min: 0, max: 1000, fractionDigits: 2 })`
  - `id`, `uuid` → `faker.string.uuid()`
  - `createdAt`, `updatedAt` → `faker.date.recent()`
- 옵셔널 필드는 70% 확률로 값을 생성하고 30% 확률로 `undefined`를 반환하도록 처리한다.

**완료 조건:**

- 모든 기본 타입에 대한 faker 매핑 완료
- 필드명 기반 추론 로직 구현 완료
- 배열 및 중첩 객체 처리 로직 완료
- 옵셔널 필드 처리 완료

### 3단계: mock-generator.mjs 파일 생성

**실행 규칙:**

- 2단계가 완료된 후에만 시작한다.
- 이 단계만 먼저 완료한다. 다른 단계로 진행하지 않는다.

**작업 내용:**

- 타입 정의 파일과 동일한 디렉토리에 `mock-generator.mjs` 파일을 생성한다.
  - `.mjs` 확장자를 사용하여 ES Module 형식으로 작성한다.
- 파일 상단에 필요한 import 문을 추가한다.
  - `import { faker } from '@faker-js/faker';`
  - 타입 정의 파일에서 필요한 타입 import
- 각 타입에 대한 generator 함수를 생성한다.
  - 함수명 형식: `generate[TypeName]()`
  - 반환 타입: 해당 타입
  - 함수 내부: 2단계에서 생성한 매핑 로직 구현
- 배열 generator 함수를 추가한다 (예: `generate[TypeName]List(count: number)`).
- 생성된 코드가 TypeScript 문법에 맞는지 확인한다.

**완료 조건:**

- mock-generator.mjs 파일 생성 완료
- import 문 추가 완료
- 모든 타입에 대한 generator 함수 생성 완료
- 배열 generator 함수 추가 완료
- TypeScript 문법 검증 완료

### 4단계: 메타데이터 추가 및 재생성 안내

**실행 규칙:**

- 3단계가 완료된 후에만 시작한다.
- 이 단계만 먼저 완료한다. 다른 단계로 진행하지 않는다.

**작업 내용:**

- mock-generator.mjs 파일 상단에 자동 생성 안내 주석을 JSDOC 형식으로 추가한다:
  ```javascript
  /**
   * 이 파일은 자동으로 생성되었습니다.
   * 수동으로 편집하지 마세요.
   *
   * @entity [Entity 이름 또는 타입 이름]
   * @source [타입 파일 경로]
   * @generated [생성 시각]
   *
   * 타입 변경 시 이 프롬프트를 다시 실행하여 재생성하세요.
   */
  ```

  - `@entity` 태그에는 생성된 generator가 대상으로 하는 entity 이름 또는 주요 타입 이름을 기록한다.
  - 예: `@entity Company`, `@entity User`, `@entity StartupDirectory`
- 사용자에게 타입 변경 시 generator 재생성 방법을 안내한다.

**완료 조건:**

- 자동 생성 안내 JSDOC 주석 추가 완료
- `@entity` 태그에 entity 정보 포함 완료
- `@source` 태그에 타입 파일 경로 포함 완료
- `@generated` 태그에 생성 시각 포함 완료
- 재생성 방법 안내 완료

### 5단계: 검증 및 결과 제공

**실행 규칙:**

- 4단계가 완료된 후에만 시작한다.
- 이 단계만 먼저 완료한다. 다른 단계로 진행하지 않는다.

**작업 내용:**

- 생성된 mock-generator.mjs 파일을 TypeScript 컴파일러로 검증한다.
- 타입 에러가 없는지 확인한다.
- generator 함수를 실행하여 mock data가 정상적으로 생성되는지 테스트한다.
- 생성된 파일 경로와 사용 예시를 사용자에게 제공한다.

**완료 조건:**

- TypeScript 컴파일 검증 완료
- 타입 에러 없음 확인 완료
- mock data 생성 테스트 완료
- 사용자에게 결과 제공 완료

## 실행 원칙

### 단계별 진행 규칙

1. **순차 실행**: 각 단계는 반드시 이전 단계가 완료된 후에만 시작한다.
2. **단계별 완료**: 각 단계는 완료 조건을 충족한 후에만 다음 단계로 진행한다.
3. **중간 확인**: 각 단계 완료 후 중간 결과를 확인하고 다음 단계로 진행한다.
4. **검증 필수**: 생성된 코드는 TypeScript 타입 체크를 통과해야 한다.

### 금지 사항

- 한 번에 여러 단계를 동시에 진행하지 않는다.
- 타입 정의 파일이 존재하지 않으면 작업을 진행하지 않는다.
- TypeScript 타입 에러가 있는 코드를 생성하지 않는다.
- 수동으로 작성된 기존 mock-generator.mjs 파일을 경고 없이 덮어쓰지 않는다.
