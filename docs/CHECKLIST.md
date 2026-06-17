# K-Beauty Shop — 중간 점검 가이드 (Phase 1 + 2)

초보자도 따라 할 수 있는 **로컬 실행·확인** 체크리스트입니다.

---

## 1. 사전 준비

- [ ] Node.js 18 이상 설치
- [ ] 프로젝트 폴더로 이동: `cd k-beauty-shop`
- [ ] 패키지 설치: `npm install`

---

## 2. 환경 변수 (.env.local)

1. 프로젝트 루트에 `.env.local.example` 파일을 복사해 `.env.local` 생성
2. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 → **Settings → API**
3. 아래 값을 붙여넣기:

```env
NEXT_PUBLIC_SUPABASE_URL=여기에_Project_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_anon_public_키
```

- [ ] `.env.local` 파일 생성 완료
- [ ] URL·anon 키 입력 완료

---

## 3. Supabase SQL 실행

Supabase **SQL Editor**에서 **순서대로** 실행:

1. [ ] `supabase/schema.sql` 전체 실행
2. [ ] `supabase/migrations/001_rls_and_profiles.sql` 실행

> Auth 테스트를 빠르게 하려면: **Authentication → Providers → Email** 에서 **Confirm email** 을 끄면 이메일 인증 없이 로그인할 수 있습니다.

---

## 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 아래 URL을 열어 확인하세요.

| URL | 확인 내용 |
|-----|-----------|
| http://localhost:3000 | K-Beauty Shop 홈 (한국어, 핑크 브랜딩) |
| http://localhost:3000/signup | 회원가입 폼 |
| http://localhost:3000/login | 로그인 폼 |
| http://localhost:3000/account | 마이페이지 (로그인 후) |
| http://localhost:3000/products | 상품 목록 (플레이스홀더) |
| http://localhost:3000/admin | 관리자 (플레이스홀더) |

- [ ] `npm run dev` 오류 없이 실행
- [ ] 홈 페이지가 Next.js 기본 화면이 **아님**
- [ ] 회원가입 → 로그인 → 마이페이지 흐름 테스트

---

## 5. 빌드 검증 (선택)

배포 전 프로덕션 빌드 확인:

```bash
npm run build
```

- [ ] `npm run build` 성공

---

## 6. 문서 참고

- `docs/PHASE1.md` — 프로젝트 구조·스키마·로드맵
- `docs/PHASE2.md` — Supabase·인증 설정 상세

---

## 문제 해결

| 증상 | 확인 |
|------|------|
| Supabase 관련 오류 | `.env.local` URL·키 재확인, dev 서버 재시작 |
| 로그인 안 됨 | SQL 마이그레이션 실행 여부, 이메일 인증 설정 |
| 빌드 실패 | `npm install` 후 `npm run build` 재실행 |

---

*Phase 1 + 2 완료 점검용 · 2026-06-17*
