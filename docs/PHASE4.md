# Phase 4 — 장바구니 & 주문 (결제 없음)

## 구현 내용

- **장바구니 로직** `src/lib/cart.ts`
  - 로그인 + Supabase 설정: `cart_items` 테이블
  - 그 외: 쿠키 기반 데모 장바구니 (샘플 상품 ID)
- **서버 액션** `src/app/actions/cart.ts`, `src/app/actions/checkout.ts`
- **상품 상세** 수량 선택 + 장바구니 담기 (MOQ 이상)
- **장바구니** `/cart` — 목록, 수량 변경, 삭제, 소계
- **체크아웃** `/checkout` — 배송 폼, 주문 생성 (결제 없음)
- **주문 확인** `/orders/[order_number]`
- **헤더** 장바구니 수량 뱃지

주문 번호 형식: `KB-YYYYMMDD-XXXX` · 상태 `pending`

---

## 빠른 테스트 (Supabase 없이)

1. `npm run dev` 실행
2. http://localhost:3000/products 에서 상품 선택
3. MOQ 이상 수량 입력 후 **장바구니 담기**
4. 헤더 **장바구니** 뱃지 숫자 확인
5. http://localhost:3000/cart 에서 수량 변경 / 삭제
6. **결제하기** → 배송 정보 입력 → **주문하기**
7. `/orders/KB-...` 확인 페이지로 이동
8. 장바구니가 비워졌는지 확인

데모 주문은 브라우저 쿠키(`kb_demo_cart`, `kb_demo_orders`)에 저장됩니다.

---

## Supabase + 로그인 테스트

1. `.env.local`에 Supabase URL/anon key 설정
2. SQL Editor에서 `schema.sql`, RLS 마이그레이션, `seed.sql` 적용
3. `/signup` → `/login` 로그인
4. DB 상품을 장바구니에 담기 → `cart_items` 확인
5. 체크아웃 후 `orders`, `order_items` 테이블 확인
6. 주문 완료 시 장바구니 자동 비우기 확인

**참고:** 로그인 + Supabase 연동 시 DB 장바구니/주문을 사용합니다.  
샘플 fallback 상품(`static-*` ID)은 쿠키 장바구니로만 동작합니다.

---

## 확인 URL

| URL | 내용 |
|-----|------|
| http://localhost:3000/products/lumiere-rose-hydrating-essence | 담기 + 수량 |
| http://localhost:3000/cart | 장바구니 |
| http://localhost:3000/checkout | 배송 폼 |
| http://localhost:3000/orders/KB-20250617-1234 | 주문 확인 (예시) |

---

## Phase 5 예정

- Stripe / Toss 결제 연동
- `pending` → `paid` 상태 전환
- 결제 실패·취소 처리

**「5단계 시작」** 으로 진행
