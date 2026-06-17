# Phase 7 — Vercel 배포

로컬 개발(Phase 1–6)이 끝났다면, 이 문서대로 **GitHub → Vercel** 에 올려 공개 URL을 만듭니다.  
실제 배포는 본인 Vercel 계정 연결이 필요합니다. (이 저장소만으로 자동 배포되지 않습니다.)

---

## 사전 확인

- [ ] 로컬에서 `npm run build` 성공
- [ ] `npm run dev` → http://localhost:3000 정상 동작
- [ ] `.env.local` 은 **Git에 올리지 않음** (`.gitignore`에 `.env*` 포함)

---

## 1단계 — GitHub에 코드 올리기

> 현재 저장소에 커밋이 없다면 아래를 **처음 한 번** 실행하세요.

### 1-1. Git 초기 커밋 (필요 시)

프로젝트 폴더에서 PowerShell:

```powershell
cd C:\Users\정형열\k-beauty-shop
git add .
git commit -m "Initial commit: K-Beauty Shop Phase 1-6"
```

### 1-2. GitHub 저장소 만들기

1. [github.com](https://github.com) 로그인
2. **New repository** 클릭
3. 이름 예: `k-beauty-shop`
4. **Public** 또는 **Private** 선택
5. **Create repository** (README 추가는 선택 — 이미 있으면 생략)

### 1-3. 원격 연결 후 push

GitHub에서 안내하는 URL을 사용합니다 (`YOUR_USER` 를 본인 계정으로 바꿈):

```powershell
git remote add origin https://github.com/YOUR_USER/k-beauty-shop.git
git branch -M main
git push -u origin main
```

- [ ] GitHub에서 파일 목록이 보이는지 확인
- [ ] `.env.local` 이 **없는지** 확인 (있으면 즉시 삭제 후 재 push)

---

## 2단계 — Vercel에서 프로젝트 가져오기

1. [vercel.com](https://vercel.com) 가입·로그인 (GitHub 계정 연동 권장)
2. 대시보드 → **Add New…** → **Project**
3. **Import Git Repository** 에서 `k-beauty-shop` 선택
4. **Import** 클릭

### 빌드 설정 (대부분 자동 감지)

| 항목 | 값 |
|------|-----|
| Framework Preset | **Next.js** |
| Root Directory | `./` (기본값) |
| Build Command | `npm run build` |
| Output Directory | (비워 둠 — Next.js 기본) |
| Install Command | `npm install` |

> `package.json`에 이미 `build` 스크립트가 있으므로 **추가 설정 없이** 진행해도 됩니다.

**Deploy** 를 누르기 **전에** 3단계 환경 변수를 먼저 넣는 것을 권장합니다.

---

## 3단계 — 환경 변수 (Vercel Dashboard)

**Project → Settings → Environment Variables** 에서 아래를 추가합니다.  
`.env.local` 에 쓰던 값을 **그대로** 복사해 넣으면 됩니다.

| 변수명 | 필수 | 설명 | 어디서 가져오나 |
|--------|:----:|------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 프로젝트 URL | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | 공개 anon 키 | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ | 서비스 롤 키 (Stripe webhook·관리자 DB 작업) | Supabase → Settings → API → service_role (**비공개**) |
| `STRIPE_SECRET_KEY` | 선택 | Stripe 비밀 키 | Stripe Dashboard → Developers → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 선택 | Stripe 공개 키 | 동일 |
| `STRIPE_WEBHOOK_SECRET` | 선택 | 프로덕션 Webhook 시크릿 | Stripe → Webhooks (배포 URL 등록 후) |
| `NEXT_PUBLIC_APP_URL` | ✅ 권장 | 사이트 기준 URL (결제 success/cancel) | 배포 후 `https://프로젝트명.vercel.app` |

### 환경(Environments) 체크

각 변수 추가 시 **Production** 에 체크하세요.  
Preview·Development 에도 같은 값을 쓰려면 함께 체크합니다.

### `NEXT_PUBLIC_APP_URL` 예시

첫 배포 후 Vercel이 부여한 URL을 **슬래시 없이** 넣습니다:

```env
NEXT_PUBLIC_APP_URL=https://k-beauty-shop.vercel.app
```

> 미설정 시 코드가 `VERCEL_URL` 로 자동 보완하지만, Stripe·북마크 일관성을 위해 **명시 설정을 권장**합니다.

### Stripe·Supabase 없을 때 (데모 모드)

Supabase·Stripe 키 없이도 배포는 가능합니다.  
상품·장바구니·데모 주문은 동작하고, DB·실결제는 비활성입니다.

---

## 4단계 — 배포 실행

1. 환경 변수 저장 후 **Deployments** 탭에서 **Redeploy** (또는 처음이면 **Deploy**)
2. 빌드 로그에서 `npm run build` 성공 확인
3. **Visit** 로 사이트 열기

### 예상 프로덕션 URL 형식

| 유형 | URL 형식 |
|------|----------|
| Vercel 기본 도메인 | `https://<프로젝트-이름>.vercel.app` |
| 팀/계정 접두사가 붙는 경우 | `https://<프로젝트-이름>-<팀slug>.vercel.app` |
| Preview (PR마다) | `https://<프로젝트>-<해시>-<팀>.vercel.app` |
| 커스텀 도메인 (나중에) | `https://www.your-domain.com` |

실제 URL은 Vercel 대시보드 **Domains** 탭에 표시됩니다.

---

## 5단계 — 배포 후 연동 (Supabase·Stripe)

### Supabase

1. Supabase → **Authentication → URL Configuration**
2. **Site URL** 을 프로덕션 URL로 변경 (예: `https://k-beauty-shop.vercel.app`)
3. **Redirect URLs** 에 동일 도메인 추가 (필요 시 `/account` 등)

### Stripe (결제 사용 시)

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. Endpoint URL:

   ```
   https://<프로젝트-이름>.vercel.app/api/stripe/webhook
   ```

3. 이벤트: `checkout.session.completed`
4. 생성된 **Signing secret** (`whsec_...`) → Vercel `STRIPE_WEBHOOK_SECRET` 에 추가
5. **Redeploy** (환경 변수 반영)

---

## 6단계 — 배포 후 테스트 URL

`<YOUR_URL>` 을 실제 Vercel URL로 바꿔 확인하세요.

| 확인 항목 | URL |
|-----------|-----|
| 홈 | `https://<YOUR_URL>/` |
| 상품 목록 | `https://<YOUR_URL>/products` |
| 장바구니 | `https://<YOUR_URL>/cart` |
| 체크아웃 | `https://<YOUR_URL>/checkout` |
| 로그인 | `https://<YOUR_URL>/login` |
| 관리자 | `https://<YOUR_URL>/admin` |
| Stripe Checkout API | `POST https://<YOUR_URL>/api/stripe/checkout-session` |
| Stripe Webhook | `POST https://<YOUR_URL>/api/stripe/webhook` |

### 체크리스트

- [ ] 홈·상품 페이지 한국어 UI 표시
- [ ] Supabase 설정 시 로그인·마이페이지 동작
- [ ] 데모/Stripe 모드에서 주문 생성
- [ ] 관리자 계정(`profiles.role = 'admin'`)으로 `/admin/orders` 접근

---

## 7단계 — 커스텀 도메인 (나중에)

1. Vercel → **Project → Settings → Domains**
2. 도메인 입력 (예: `shop.example.com`)
3. DNS에 Vercel이 안내하는 **A/CNAME** 레코드 추가
4. SSL은 Vercel이 자동 발급
5. 도메인 연결 후 `NEXT_PUBLIC_APP_URL` 을 새 URL로 업데이트 → **Redeploy**
6. Supabase Site URL·Stripe Webhook URL도 동일하게 변경

---

## 프로젝트 배포 관련 파일

| 파일 | 역할 |
|------|------|
| `package.json` | `build` / `start` 스크립트 |
| `next.config.ts` | Next.js 설정 (Vercel 기본 호환) |
| `vercel.json` | 보안 헤더 (선택) |
| `.vercelignore` | 배포 번들에서 제외할 로컬 파일 |
| `.gitignore` | `.env*`, `.vercel` 제외 |
| `.env.local.example` | 로컬·Vercel 환경 변수 템플릿 |

---

## 문제 해결

| 증상 | 확인 |
|------|------|
| 빌드 실패 | Vercel 로그에서 TypeScript 오류 확인 → 로컬 `npm run build` 재현 |
| Supabase 오류 | Vercel 환경 변수 URL·키, Supabase Site URL |
| Stripe 결제 후 pending 유지 | Webhook URL·`STRIPE_WEBHOOK_SECRET`·`SUPABASE_SERVICE_ROLE_KEY` |
| 404 on refresh | Next.js App Router — Vercel이 자동 처리 (추가 rewrite 불필요) |
| 환경 변수 반영 안 됨 | 저장 후 **Redeploy** 필수 (`NEXT_PUBLIC_*` 포함) |

---

## 다음 단계 (Phase 8 예정)

- Toss Payments 연동 (`docs/PHASE6.md` 참고)
- SEO·OG 메타, 성능 최적화
- 모니터링·에러 추적

---

*Phase 7 · Vercel 배포 가이드 · 2026-06-17*
