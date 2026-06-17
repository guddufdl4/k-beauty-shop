# Phase 5 — Stripe 결제 연동

## 구현 내용

- **Stripe 라이브러리** `src/lib/stripe.ts`
  - 키 감지 (`isStripeConfigured`)
  - Checkout Session 생성
  - Webhook 서명 검증
  - 결제 완료 세션 확인 (success URL 콜백)
- **API**
  - `POST /api/stripe/checkout-session` — 주문 번호로 결제 세션 생성
  - `POST /api/stripe/webhook` — `checkout.session.completed` 시 `paid` 처리
- **주문 상태** `pending` → `paid` (`payment_provider`, `payment_intent_id`, `paid_at`)
- **체크아웃** Stripe 키 있으면 Checkout으로 리다이렉트, 없으면 데모 모드(결제 없이 주문만)

---

## 환경 변수 설정

`.env.local.example`을 복사해 `.env.local` 작성:

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

| 변수 | 설명 |
|------|------|
| `STRIPE_SECRET_KEY` | Stripe 대시보드 → Developers → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 클라이언트용 공개 키 |
| `STRIPE_WEBHOOK_SECRET` | Webhook 엔드포인트 시크릿 |
| `NEXT_PUBLIC_APP_URL` | success/cancel URL 기준 (로컬: `http://localhost:3000`) |

**Supabase DB 주문** webhook에서 `paid` 업데이트 시 `SUPABASE_SERVICE_ROLE_KEY`도 필요합니다.

### Stripe 키 없을 때 (데모 모드)

- 체크아웃에 안내 문구 표시
- **주문하기 (데모 · 결제 없음)** 버튼으로 주문만 생성
- 상태는 `pending` 유지, Phase 4와 동일하게 쿠키/DB에 저장

---

## 로컬 Stripe 테스트

1. `npm install` (stripe 패키지 포함)
2. `.env.local`에 테스트 키 입력
3. `npm run dev`
4. 상품 담기 → `/checkout` → **Stripe로 결제하기**
5. Stripe 테스트 카드: `4242 4242 4242 4242` (유효기간/CVC 임의)
6. 결제 후 `/orders/KB-...?session_id=...` 에서 **결제 완료** 확인

### Webhook (로컬)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

출력된 `whsec_...` 를 `STRIPE_WEBHOOK_SECRET`에 설정 후 서버 재시작.

Webhook과 success URL 콜백 둘 다 `paid` 처리를 시도합니다 (중복 호출 안전).

---

## 확인 URL

| URL | 내용 |
|-----|------|
| http://localhost:3000/checkout | 결제 폼 · Stripe/데모 안내 |
| http://localhost:3000/api/stripe/checkout-session | POST `{ "orderNumber": "KB-..." }` |
| http://localhost:3000/api/stripe/webhook | Stripe Webhook 수신 |
| http://localhost:3000/orders/KB-20250617-1234 | 주문 확인 (데모: pending) |
| http://localhost:3000/orders/KB-20250617-1234?session_id=cs_... | 결제 완료 후 (paid) |

---

## 빌드

```bash
npm.cmd run build
```

Stripe 키 없이도 빌드·실행 가능합니다.

---

## Phase 6 예정

- Toss Payments 연동
- 결제 실패·환불 UI
- 관리자 주문 상태 변경

**「6단계 시작」** 으로 진행
