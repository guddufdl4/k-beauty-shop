# Phase 8 — 실제 상업 운영 (Supabase 연결)

로컬 데모 모드에서 **실제 Supabase DB** + **Vercel 프로덕션** 으로 전환하는 단계입니다.

---

## 완료된 작업

| 항목 | 상태 |
|------|------|
| Supabase 프로젝트 생성 | ✅ |
| SQL 실행 (`reset-and-setup.sql`, `seed.sql`) | ✅ |
| Vercel 환경변수 3개 + Redeploy | ✅ |
| 프로덕션 상품 목록 (노란 배너 제거) | ✅ |
| 로컬 `.env.local` 생성 | ✅ |
| 설정 문서 (`docs/SUPABASE_SETUP.md`) | ✅ |

---

## 남은 수동 작업 (Supabase 대시보드)

자세한 클릭 순서는 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) 참고.

### 1. Auth Site URL

Supabase → **Authentication** → **URL Configuration**

- **Site URL:** `https://k-beauty-shop.vercel.app`
- **Redirect URLs:** `https://k-beauty-shop.vercel.app/**`, `http://localhost:3000/**`

### 2. 회원가입 + 관리자 SQL

1. `/signup` 에서 계정 생성
2. Supabase SQL Editor:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
```

3. `/admin` 접속 확인

---

## 환경 변수 요약

| 환경 | `NEXT_PUBLIC_APP_URL` |
|------|------------------------|
| 로컬 (`.env.local`) | `http://localhost:3000` |
| Vercel (Production) | `https://k-beauty-shop.vercel.app` |

Supabase URL·anon key는 **로컬과 Vercel 동일**.

---

## 테스트 URL

| 페이지 | 프로덕션 | 로컬 |
|--------|----------|------|
| 상품 | https://k-beauty-shop.vercel.app/products | http://localhost:3000/products |
| 로그인 | `/login` | 동일 |
| 관리자 | `/admin` | 동일 |

---

## 다음 단계 (선택)

- Stripe 실결제 (`STRIPE_*` 환경변수)
- Toss Payments 연동
- 커스텀 도메인 (Vercel Domains)
- SEO·성능 최적화

---

*Phase 8 · Supabase + Vercel 연결 · 2026-06-18*
