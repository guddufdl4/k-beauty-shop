# Supabase 설정 가이드 (K-Beauty Shop)

## 왜 오류가 났나요?

`schema.sql`(B2B용 복잡 스키마)와 앱 코드·`seed.sql`이 기대하는 테이블 구조가 달라서, `products.status` 같은 컬럼이 없어 SQL이 실패했습니다.

---

## 1단계: DB 초기화 + 앱 스키마 적용

1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택 → **SQL Editor**
2. **New query** 클릭
3. 프로젝트의 `supabase/reset-and-setup.sql` 파일 **전체**를 복사해 붙여넣기
4. **Run** 클릭

> ⚠️ 기존 `schema.sql`로 만든 테이블·데이터는 **모두 삭제**됩니다. (새 프로젝트라면 문제 없습니다.)

---

## 2단계: 샘플 데이터 넣기

1. SQL Editor에서 **New query**
2. `supabase/seed.sql` **전체** 복사 → 붙여넣기 → **Run**

카테고리 4개, 상품 5개가 들어갑니다.

---

## 3단계: 환경 변수 설정

Supabase → **Project Settings** → **API** 에서 아래 값을 복사합니다.

| 변수 | 어디에 |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + 로컬 `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + 로컬 `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + 로컬 `.env.local` (서버 전용, Git에 올리지 마세요) |
| `NEXT_PUBLIC_APP_URL` | `https://k-beauty-shop.vercel.app` (로컬은 `http://localhost:3000`) |

로컬: `.env.local.example`을 복사해 `.env.local` 만들고 값을 채웁니다.

Vercel: 프로젝트 → **Settings** → **Environment Variables** 에 동일하게 추가 후 **Redeploy** 합니다.

---

## 4단계: Auth Site URL

Supabase → **Authentication** → **URL Configuration**

- **Site URL**: `https://k-beauty-shop.vercel.app`
- **Redirect URLs** (로컬 개발 시): `http://localhost:3000/**`

---

## 5단계: 관리자 권한 부여

1. Supabase → **Authentication** → **Users** 에서 본인 계정으로 **회원가입/로그인** 한 번 실행 (프로필 자동 생성)
2. SQL Editor에서 아래 실행 (이메일을 본인 주소로 변경):

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

3. [https://k-beauty-shop.vercel.app/admin](https://k-beauty-shop.vercel.app/admin) 에서 관리자 메뉴 확인

---

## 파일 정리

| 파일 | 용도 |
|------|------|
| `reset-and-setup.sql` | **지금 실행할 파일** (잘못된 schema 제거 + 앱 스키마) |
| `seed.sql` | 샘플 카테고리·상품 |
| `schema-app.sql` | 앱 스키마만 (이미 DB가 비어 있을 때 참고용) |
| `schema.sql` | 예전 B2B 설계 — **앱과 맞지 않음, 실행하지 마세요** |

---

## 확인

- 사이트: [https://k-beauty-shop.vercel.app](https://k-beauty-shop.vercel.app)
- 상품 목록에 DB 상품이 보이면 성공 (Supabase env가 Vercel에 설정된 경우)
- env 없으면 정적 데모 상품으로 동작합니다
