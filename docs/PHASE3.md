# Phase 3 — 상품 관리 & 스토어프론트 UI

## 구현 내용

### 데이터 레이어
- `src/lib/supabase/products.ts` — 카테고리·상품 목록·slug 상세 조회
- `src/lib/supabase/config.ts` — Supabase 환경 변수 확인
- `src/lib/supabase/safe-server.ts` — `.env` 없을 때 throw 없이 null 반환
- `.env` 미설정 시 **정적 샘플 데이터**로 graceful fallback

### 스토어프론트 UI
- `src/components/store/header.tsx` — 공통 네비 (Home, Categories, Products, Cart, Login)
- `/categories` — DB 카테고리 그리드 (없으면 정적 fallback)
- `/products` — 상품 그리드, 브랜드·가격·MOQ, `?category=` 필터
- `/products/[slug]` — 상세: 이미지 placeholder, 설명, 소매/도매가, 재고, MOQ, 장바구니 버튼(비활성)

### 관리자
- `/admin/products` — 상품 목록 + 간단 등록 폼
- 로그인 + `profiles.role = 'admin'` 확인, 미충족 시 안내 메시지

### 시드 데이터
- `supabase/seed.sql` — 카테고리 4개, 가상 브랜드 상품 5개, 관리자 RLS 정책

---

## 실행 순서

### 1. SQL (Supabase SQL Editor, 순서대로)

1. `supabase/schema.sql`
2. `supabase/migrations/001_rls_and_profiles.sql`
3. **`supabase/seed.sql`** ← Phase 3 샘플 데이터

### 2. 환경 변수 (선택 — 없어도 샘플 UI 동작)

프로젝트 루트 `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=여기에_Project_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_키
```

### 3. 관리자 권한 부여

회원가입 후 SQL Editor에서:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
```

### 4. 로컬 실행

```bash
npm.cmd run dev
```

---

## 테스트 URL

| 페이지 | URL |
|--------|-----|
| 홈 | http://localhost:3000/ |
| 카테고리 | http://localhost:3000/categories |
| 전체 상품 | http://localhost:3000/products |
| 스킨케어 필터 | http://localhost:3000/products?category=skincare |
| 상품 상세 (예) | http://localhost:3000/products/lumiere-rose-hydrating-essence |
| 관리자 상품 | http://localhost:3000/admin/products |

### seed 상품 slug 목록
- `lumiere-rose-hydrating-essence`
- `han-river-velvet-lip-tint-set`
- `jeju-dew-green-tea-sleep-mask`
- `seoul-glow-airy-sun-fluid`
- `peach-blossom-snail-ampoule`

---

## 빌드 확인

```bash
npm.cmd run build
```

---

## Phase 4 예정

- 장바구니 CRUD (`cart_items` 테이블 연동)
- 수량·MOQ 검증
- 로그인 사용자 장바구니 persist
- 「장바구니 담기」 버튼 활성화

**「Phase 4 시작」** 으로 진행
