#!/bin/bash

# 시작 경로 설정
SRC_DIR="/Users/yangwoolee/repo/arfin/public/raw"
DEST_DIR="/Users/yangwoolee/repo/arfin/public/project"

# JPEG 파일들을 찾아서 WebP로 변환
find "$SRC_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" \) | while read -r FILE; do
  # 원본 파일 경로에서 SRC_DIR 부분 제거
  RELATIVE_PATH="${FILE#$SRC_DIR/}"
  
  # 확장자를 .webp로 변경
  OUTPUT_FILE="${RELATIVE_PATH%.*}.webp"
  
  # 대상 디렉토리 경로 생성
  DEST_PATH="$DEST_DIR/$(dirname "$OUTPUT_FILE")"
  mkdir -p "$DEST_PATH"
  
  # cwebp 명령어를 사용해 WebP로 변환
  cwebp -size 400000 -mt "$FILE" -o "$DEST_PATH/$(basename "$OUTPUT_FILE")"
  echo "변환 완료: $FILE -> $DEST_PATH/$(basename "$OUTPUT_FILE")"
done

echo "모든 JPEG 파일이 WebP로 변환되었습니다!"
