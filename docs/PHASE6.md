# Phase 6 — 관리자 주문·대시보드

## 구현 내용

- **`/admin`** — 주문 통계(전체/대기/완료), 상품·주문 관리 링크
- **`/admin/orders`** — 주문 목록, 결제 상태, 상세 링크
- **`src/lib/admin/orders.ts`** — Supabase 주문 조회 (관리자 RLS) / 데모 쿠키 fallback
- **Toss** — `src/lib/toss.ts` 플레이스홀더 (Phase 6b 예정)

## 테스트 URL

| 페이지 | URL |
|--------|-----|
| 대시보드 | http://localhost:3000/admin |
| 주문 목록 | http://localhost:3000/admin/orders |
| 상품 관리 | http://localhost:3000/admin/products |

## 데모 모드 (Supabase 없음)

1. http://localhost:3000/products/lumiere-rose-hydrating-essence → 장바구니 → 체크아웃 → 주문
2. http://localhost:3000/admin/orders 에서 **같은 브라우저**로 주문 확인
3. 주문 행 클릭 → `/orders/KB-...` 상세

> 데모 주문은 **쿠키**에만 저장됩니다. 다른 PC/브라우저에서는 보이지 않습니다.

## Supabase + 관리자

1. `.env.local` 설정, SQL 마이그레이션 실행
2. 관리자 권한 부여:
   ```sql
   UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
   ```
3. 관리자로 로그인 후 `/admin/orders` — DB 주문 전체 조회

## Phase 7

Vercel 배포 가이드: [PHASE7.md](./PHASE7.md)
