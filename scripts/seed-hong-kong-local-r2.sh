#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
source_dir="${1:-/Users/leeyangwoo/Downloads/photo/Layers of Him}"
manifest_path="$project_dir/scripts/fixtures/hong-kong-photographs-manifest.json"
seed_dir="$(mktemp -d -t arfin-hong-kong-r2-seed)"
bucket_name="${ARFIN_R2_BUCKET:-arfinyoon}"
portfolio_prefix="${ARFIN_PORTFOLIO_PREFIX:-}"
portfolio_prefix="${portfolio_prefix%/}"
object_prefix="${portfolio_prefix:+$portfolio_prefix/}photographs/editorial/layers-of-him"

cleanup_seed_dir() {
    if command -v trash >/dev/null 2>&1; then
        trash "$seed_dir"
    else
        echo "임시 파일은 $seed_dir 에 남아 있습니다."
    fi
}

trap cleanup_seed_dir EXIT

if [[ ! -d "$source_dir" ]]; then
    echo "원본 이미지 폴더를 찾을 수 없습니다: $source_dir" >&2
    exit 1
fi

if ! command -v cwebp >/dev/null 2>&1; then
    echo "cwebp가 필요합니다. Homebrew로 webp를 설치해 주세요." >&2
    exit 1
fi

for image_index in {1..12}; do
    image_number="$(printf '%02d' "$image_index")"
    source_path="$source_dir/L_${image_number}.jpg"
    output_path="$seed_dir/L_${image_number}.webp"

    if [[ ! -f "$source_path" ]]; then
        echo "원본 이미지를 찾을 수 없습니다: $source_path" >&2
        exit 1
    fi

    width="$(sips -g pixelWidth "$source_path" | awk '/pixelWidth/ { print $2 }')"
    height="$(sips -g pixelHeight "$source_path" | awk '/pixelHeight/ { print $2 }')"

    if (( width >= height )); then
        cwebp -quiet -mt -q 82 -metadata none -resize 1920 0 "$source_path" -o "$output_path"
    else
        cwebp -quiet -mt -q 82 -metadata none -resize 0 1920 "$source_path" -o "$output_path"
    fi

    pnpm exec wrangler r2 object put \
        "$bucket_name/$object_prefix/L_${image_number}.webp" \
        --local \
        --file "$output_path" \
        --content-type image/webp \
        --cache-control "public, max-age=86400"
done

pnpm exec wrangler r2 object put \
    "$bucket_name/${portfolio_prefix:+$portfolio_prefix/}photographs/manifest.json" \
    --local \
    --file "$manifest_path" \
    --content-type application/json \
    --cache-control "no-cache"

echo "Hong Kong Editorial 데이터를 로컬 R2에 저장했습니다."
