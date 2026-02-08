# PRD Progress Tracker

**Project**: Admin (Photo portfolio management for photographer)
**Started**: 2025-02-07
**Last Updated**: 2025-02-07
**Current Stage**: Feature Development

## Overview

- **Total Epics**: 2
- **Total Features**: TBD
- **Completed Features**: 5
- **In Progress**: None
- **Pending**: TBD

## Epic Structure Status

**Status**: ✅ Approved

| N   | Folder             | Title              | Purpose                                        | Status     |
| --- | ------------------ | ------------------ | ---------------------------------------------- | ---------- |
| 0   | 0-admin-auth       | Admin 진입 및 인증 | Google 로그인으로 Admin에 접근한다             | ✅ Created |
| 1   | 1-photo-management | 사진 관리          | 사진 목록을 보고, 업로드·삭제·순서 변경을 한다 | ✅ Created |

**Approved Date**: 2025-02-07

## Feature List Status

**Status**: ⏸️ Pending

### Epic 0: Admin 진입 및 인증 (`0-admin-auth`)

- ✅ **Feature 0-1**: Google 로그인 및 Admin 진입 - `0-1-google-login-and-entry.md`
- ✅ **Feature 0-2**: 로그아웃 - `0-2-logout.md`

### Epic 1: 사진 관리 (`1-photo-management`)

- ✅ **Feature 1-1**: 사진 목록 확인 - `1-1-photo-list.md` (Completed)
- ✅ **Feature 1-2**: 사진 업로드 - `1-2-photo-upload.md` (Implemented)
- ✅ **Feature 1-3**: 삭제·순서 변경 - `1-3-photo-delete-reorder.md` (Implemented)

## Feature PRD Status

### Completed (5)

- [x] Feature 0-1: Google 로그인 및 Admin 진입 - ✅ Approved
- [x] Feature 0-2: 로그아웃 - ✅ Approved
- [x] Feature 1-1: 사진 목록 확인 - ✅ Implemented (list, empty/loading/error states)
- [x] Feature 1-2: 사진 업로드 - ✅ Implemented (R2, client optimization, drag & drop)
- [x] Feature 1-3: 삭제·순서 변경 - ✅ Implemented (삭제 확인, dnd-kit 드래그 정렬)

### In Progress (0)

### Pending

- (없음) Epic 1 사진 관리 기능 완료

## Next Actions

**Current Focus**: Epic 1 완료 — 배포

**완료 (2025-02-07)**:

- 저장소 정책: Cloudflare R2 + Pages Functions
- Feature 1-3: 삭제·순서 변경 UI (AdminSortableGallery, dnd-kit, 삭제 확인 다이얼로그)

**Steps to Resume**:

1. R2 버킷 생성: `npx wrangler r2 bucket create arfinyoon` (미완료 시)
2. Cloudflare Pages 배포 (Git 연동 또는 `pnpm pages:deploy`)

## Notes

- Why document: `prd/admin/why.md`
- Constraints: Static / Cloudflare Pages, Firebase Auth (Google login), image optimization on upload, mobile-friendly, shadcn design
