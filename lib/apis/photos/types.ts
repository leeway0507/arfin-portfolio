/**
 * Admin 사진 목록 한 건 (갤러리 그리드용)
 */
export interface PhotoListItem {
    /** R2 객체 키(파일명), 예: "Donna, 2025.webp" */
    filename: string
    /** 캡션: 파일명 기반, "(N)" 제거, 예: "Donna, 2025" */
    caption: string
    /** 노출 순서 (0부터) */
    order: number
    /** 이미지 URL (NEXT_PUBLIC_IMAGE_URL + filename, CDN에서 직접 로드) */
    imageUrl: string
    /** 낙관적 추가 후 실제 업로드 완료 전까지 true. 갤러리에서 로딩 오버레이 표시용 */
    isPendingUpload?: boolean
    /** 삭제 API 호출 중일 때 true. 갤러리에서 로딩 오버레이 표시용 */
    isDeleting?: boolean
}
