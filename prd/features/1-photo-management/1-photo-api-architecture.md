# 사진 관리 API 아키텍처: Cloudflare Pages Functions + R2

> 📄 **Context**: [1-photo-management-context.md](./1-photo-management-context.md)  
> **정책 변경일**: 2025-02-07

## 개요

사진 업로드·수정·삭제를 **Cloudflare Pages Functions**로 처리하고, **R2**를 스토리지로 사용한다. 기존 Firebase Storage 기반 구현을 R2 + Pages Functions로 전환한다.

## 아키텍처

```
[Next.js Client] --fetch--> [Cloudflare Pages Functions] --R2 API--> [R2 Bucket]
     (Admin)                      /api/photos/*                       portfolio/
```

- **클라이언트**: Admin 페이지에서 `fetch()`로 Pages Functions API 호출
- **Functions**: `functions/api/photos/` 경로에서 list / upload / delete / reorder 처리
- **R2**: `portfolio/` prefix 하위에 이미지 저장, `order/order.json`에 순서·캡션 통합 저장 (`[{ "filename", "caption"? }, ...]`)

## API 스펙

| Method | Path | 용도 |
|--------|------|------|
| GET | `/api/photos` | 사진 목록 조회 (캡션 포함: 저장값 또는 파일명 기반) |
| POST | `/api/photos` | 사진 업로드 (multipart/form-data) |
| DELETE | `/api/photos?filename=xxx` | 사진 삭제 |
| PATCH | `/api/photos` | 순서 변경 (body: `{ filenames: string[] }`) 또는 캡션 수정 (body: `{ filename, caption }`) |

## 인증

- 클라이언트는 Firebase Auth 로그인 후 `Authorization: Bearer <idToken>` 헤더로 요청
- Pages Function에서 Firebase tokeninfo API로 ID 토큰 검증
- 검증 실패 시 401 반환

## 배포

- Next.js: `output: 'export'` → static 빌드 → Cloudflare Pages
- Pages Functions: 프로젝트 루트 `functions/` 디렉터리에 배치
- R2: wrangler `r2_buckets` 바인딩으로 Function에 연결

## 관련 문서

- [1-1-photo-list.md](./1-1-photo-list.md)
- [1-2-photo-upload.md](./1-2-photo-upload.md)
- [1-3-photo-delete-reorder.md](./1-3-photo-delete-reorder.md) — 삭제·순서 변경
- [1-4-caption-edit.md](./1-4-caption-edit.md) — 캡션 관리·수정
