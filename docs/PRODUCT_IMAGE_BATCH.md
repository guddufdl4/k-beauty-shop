# Product image batch (100 at a time)

Hanmi Excel import 후 image_url이 없는 상품을 한 번에 100개씩 처리합니다.

## Setup

Apply migration: supabase/migrations/005_product_image_fill_runs.sql

## Usage

- UI: /admin/products -> "이미지 100개 채우기"
- Detail: /admin/products/images
- API: POST /api/admin/products/images/batch?limit=100

## Priority

1. source_row Excel URL columns
2. categories.image_url
3. /images/categories/{slug}.svg placeholder

## Scale

~18,000 products = ~180 batches (100 each). ~18,700 = ~187 batches.

## Limits

No automatic web image search. Placeholders are temporary; replace with real photos manually.