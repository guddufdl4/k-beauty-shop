# Phase 8 — 상용 프로덕션 (Supabase + Vercel)

> **목표:** 데모 모드를 끝내고 **실제 DB·로그인·관리자**가 동작하는 프로덕션 환경을 만듭니다.  
> **라이브 URL:** https://k-beauty-shop.vercel.app/

Phase 7에서 Vercel 배포가 끝났다면, 이 문서 순서대로 **Supabase 프로젝트 생성 → SQL 실행 → Vercel 환경 변수 → 재배포** 하세요.

---

## 사전 확인

- [ ] GitHub에 최신 코드 push 완료
- [ ] Vercel 프로젝트 연결·첫 배포 성공 (`npm run build` 통과)
- [ ] `.env.local` 은 Git에 **올리지 않음**

---

## A. Supabase 프로젝트 만들기

1. [supabase.com](https://supabase.com) 로그인
2. 대시보드 → **New project** 클릭
3. 입력 항목:
   - **Organization:** 본인 조직 선택 (없으면 새로 생성)
   - **Name:** `k-beauty-shop` (원하는 이름)
   - **Database Password:** 강한 비밀번호 (메모해 두세요 — 나중에 직접 DB 접속 시 필요)
   - **Region:** `Northeast Asia (Seoul)` 권장
4. **Create new project** 클릭 → 프로비저닝 완료까지 1~2분 대기

---

## B. SQL Editor에서 스키마·RLS·시드 실행

프로젝트가 준비되면 **왼쪽 메뉴 → SQL Editor** 로 이동합니다.  
아래 **3개 파일을 순서대로** 각각 새 쿼리 탭에 붙여넣고 **Run** 하세요.

| 순서 | 파일 | 역할 |
|:----:|------|------|
| 1 | `supabase/schema.sql` | 테이블·enum·기본 구조 |
| 2 | `supabase/migrations/001_rls_and_profiles.sql` | RLS 정책, 회원가입 시 profiles 자동 생성 |
| 3 | `supabase/seed.sql` | 샘플 카테고리·상품·관리자 정책 |

### 실행 방법 (각 파일마다 반복)

1. SQL Editor → **+ New query**
2. 로컬 `k-beauty-shop/supabase/` 폴더에서 해당 `.sql` 파일 전체 복사
3. 에디터에 붙여넣기 → **Run** (또는 Ctrl+Enter)
4. 하단 **Success. No rows returned** 또는 완료 메시지 확인
5. 오류가 나면 **이전 단계를 건너뛰지 않았는지** 확인 후 재실행

> `schema.sql` 을 두 번 실행하면 "already exists" 오류가 날 수 있습니다. 그 경우 2번·3번만 진행하세요.

### 데이터 확인 (선택)

- **Table Editor** → `products`, `categories` 에 샘플 행이 보이면 seed 성공
- **Authentication** → 아직 사용자 없음 (회원가입 후 생김)

---

## C. Supabase API 키를 Vercel 환경 변수에 등록

### C-1. Supabase에서 값 복사

1. Supabase 대시보드 → **Project Settings** (왼쪽 하단 톱니)
2. **API** 메뉴 클릭
3. 아래 두 값을 메모장에 복사:

| Supabase 화면 항목 | Vercel 변수명 |
|-------------------|---------------|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon public** (Project API keys) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** (secret, reveal 클릭) | `SUPABASE_SERVICE_ROLE_KEY` |

> `service_role` 키는 **절대** 브라우저·GitHub에 노출하지 마세요. Vercel Production만 체크 권장.

### C-2. Vercel에 추가

1. [vercel.com](https://vercel.com) → **k-beauty-shop** 프로젝트
2. **Settings** → **Environment Variables**
3. 변수 하나씩 **Add** (Name / Value 붙여넣기)
4. **Environments:** 최소 **Production** 체크
5. **Save**

---

## D. `NEXT_PUBLIC_APP_URL` 설정

Vercel Environment Variables에 추가:

```env
NEXT_PUBLIC_APP_URL=https://k-beauty-shop.vercel.app
```

- **슬래시(`/`) 없이** 입력
- Stripe 결제 success/cancel URL, 이메일 링크 등에 사용됩니다

---

## E. Supabase Auth — Site URL 설정

1. Supabase → **Authentication** (왼쪽 메뉴)
2. **URL Configuration** 탭
3. 설정:

| 필드 | 값 |
|------|-----|
| **Site URL** | `https://k-beauty-shop.vercel.app` |
| **Redirect URLs** | `https://k-beauty-shop.vercel.app/**` (와일드카드 허용 시) |

로컬 개발도 함께 쓰려면 Redirect URLs에 추가:

```
http://localhost:3000/**
```

4. **Save** 클릭

---

## F. 관리자 계정 만들기

### F-1. 회원가입

1. 브라우저에서 https://k-beauty-shop.vercel.app/signup 접속
2. 관리자로 쓸 이메일·비밀번호로 가입
3. 이메일 인증이 켜져 있으면 Supabase **Authentication → Users** 에서 확인·승인

### F-2. SQL로 admin 권한 부여

Supabase → **SQL Editor** → New query:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-admin@email.com';
```

`your-admin@email.com` 을 **가입한 이메일**로 바꾼 뒤 **Run**.

### F-3. 확인

- **Table Editor** → `profiles` → 해당 행의 `role` 이 `admin` 인지 확인
- 브라우저에서 로그아웃 후 다시 로그인 → `/admin` 접근

---

## G. Vercel 재배포 (Redeploy)

환경 변수는 **저장만으로는 반영되지 않습니다.** 반드시 재배포하세요.

1. Vercel → **Deployments** 탭
2. 최신 배포 오른쪽 **⋯** → **Redeploy**
3. **Use existing Build Cache** 체크 해제 권장 (환경 변수 확실히 반영)
4. 빌드 로그에서 `npm run build` 성공 확인
5. **Visit** 로 사이트 열기

---

## Vercel 환경 변수 전체 목록

| 변수명 | 필수 | 설명 |
|--------|:----:|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | anon public 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | service_role (Webhook·관리자 DB) |
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://k-beauty-shop.vercel.app` |
| `STRIPE_SECRET_KEY` | 선택 | Stripe 결제 사용 시 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 선택 | Stripe 공개 키 |
| `STRIPE_WEBHOOK_SECRET` | 선택 | Stripe Webhook |
| `TOSS_CLIENT_KEY` | 선택 | 토스페이 (추후) |
| `TOSS_SECRET_KEY` | 선택 | 토스페이 (추후) |

로컬 개발용 템플릿: 프로젝트 루트 `.env.local.example` 참고.

---

## Supabase 대시보드 화면 순서 (요약)

처음 설정할 때 아래 순서로 메뉴를 이동하면 됩니다.

```
1. New project (프로젝트 생성)
2. SQL Editor → schema.sql 실행
3. SQL Editor → 001_rls_and_profiles.sql 실행
4. SQL Editor → seed.sql 실행
5. Project Settings → API → URL·anon·service_role 복사
6. Authentication → URL Configuration → Site URL 설정
7. (회원가입 후) SQL Editor → UPDATE profiles SET role='admin'
8. Table Editor → products/categories 데이터 확인 (선택)
```

---

## 설정 완료 후 테스트 URL

`<URL>` = `https://k-beauty-shop.vercel.app`

| 확인 항목 | URL | 기대 결과 |
|-----------|-----|-----------|
| 홈 | `<URL>/` | Supabase 연결 시 "미연결" 경고 **없음**, DB 상품 표시 |
| 회사 소개 | `<URL>/about` | 회사 소개 페이지 |
| 이용약관 | `<URL>/terms` | 이용약관 stub |
| 상품 목록 | `<URL>/products` | seed 상품 목록 |
| 상품 상세 | `<URL>/products/lumiere-rose-hydrating-essence` | 상세·장바구니 |
| 장바구니 | `<URL>/cart` | 담기 동작 |
| 로그인 | `<URL>/login` | Supabase Auth |
| 회원가입 | `<URL>/signup` | 가입 후 profiles 자동 생성 |
| 마이페이지 | `<URL>/account` | 로그인 후 접근 |
| 관리자 | `<URL>/admin` | admin role만 접근 |
| 주문 관리 | `<URL>/admin/orders` | DB 주문 목록 |

### 체크리스트

- [ ] 홈에서 "Supabase 미연결" 배너가 사라짐
- [ ] 로그인·로그아웃 정상
- [ ] admin 계정으로 `/admin` 접근 가능
- [ ] 주문 생성 후 `/admin/orders` 에 표시 (Supabase 모드)
- [ ] 푸터 **회사 소개** · **이용약관** 링크 동작

---

## Stripe 연동 (선택, Phase 5)

결제까지 쓰려면 Phase 7 문서 5단계를 추가로 진행하세요.

1. Stripe Webhook: `https://k-beauty-shop.vercel.app/api/stripe/webhook`
2. `STRIPE_WEBHOOK_SECRET` → Vercel 추가 → Redeploy

---

## 문제 해결

| 증상 | 확인 |
|------|------|
| 여전히 "Supabase 미연결" | Vercel env 3종 + `NEXT_PUBLIC_APP_URL` → **Redeploy** |
| 로그인 후 리다이렉트 오류 | Supabase Site URL·Redirect URLs |
| `/admin` 접근 거부 | `profiles.role = 'admin'` SQL 재실행, 재로그인 |
| 상품 0개 | `seed.sql` 실행 여부, Table Editor 확인 |
| RLS 오류 | `001_rls_and_profiles.sql` 실행 순서 |
| 빌드 실패 | 로컬 `npm run build` 로 오류 재현 |

---

## Phase 8에서 추가된 페이지

| URL | 파일 |
|-----|------|
| `/about` | `src/app/(storefront)/about/page.tsx` |
| `/terms` | `src/app/(storefront)/terms/page.tsx` |

회사명·사업자 정보는 `about/page.tsx` 상단 `COMPANY_NAME` 상수를 수정하면 됩니다.

---

*Phase 8 · 상용 프로덕션 가이드 · 2026-06-18*
