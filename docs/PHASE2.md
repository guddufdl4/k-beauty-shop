# Phase 2 — Supabase 연결 & 인증

## 구현 내용

- `@supabase/supabase-js`, `@supabase/ssr` 연동
- `middleware.ts` — 세션 갱신
- `/login`, `/signup`, `/account` — 이메일·비밀번호 인증
- `supabase/migrations/001_rls_and_profiles.sql` — 프로필 자동 생성 + RLS

---

## 사용자 설정 (필수)

### 1. Supabase API 키 복사

1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택
2. **Settings → API**
3. **Project URL**, **anon public** 키 복사

### 2. `.env.local` 만들기

프로젝트 루트에 `.env.local` 파일 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=여기에_Project_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_키
```

(`.env.local.example` 참고)

### 3. SQL 실행 (순서대로)

Supabase **SQL Editor**에서:

1. `supabase/schema.sql` 전체 실행
2. `supabase/migrations/001_rls_and_profiles.sql` 실행

### 4. 로컬 실행

```bash
npm run dev
```

- http://localhost:3000/signup — 회원가입
- http://localhost:3000/login — 로그인
- http://localhost:3000/account — 마이페이지

---

## Supabase Auth 설정

Dashboard → **Authentication → Providers → Email**:

- Email provider **Enabled**
- (테스트용) **Confirm email** 끄면 바로 로그인 가능

---

## Phase 3 예정

- 상품 CRUD · 목록/상세 UI
- 관리자 상품 등록

**「3단계 시작」** 또는 **「Phase 3 승인」** 으로 진행
