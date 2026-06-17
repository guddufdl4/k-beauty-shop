# Phase 11 — 커스텀 도메인 연결 (Vercel)

`k-beauty-shop.vercel.app` 대신 **본인 도메인**(예: `www.mykbeauty.com`)으로 쇼핑몰을 열 수 있게 하는 단계입니다.  
Phase 7(Vercel 배포)·Phase 8(Supabase 연결)이 끝난 상태를 가정합니다.

---

## 이 단계에서 필요한 것

| 항목 | 설명 |
|------|------|
| **도메인 이름** | 이미 구매한 인터넷 주소 (예: `mykbeauty.com`) |
| **도메인 등록 업체 계정** | DNS 설정을 바꿀 수 있는 곳 |
| **Vercel 프로젝트** | `k-beauty-shop` (이미 배포됨) |
| **Supabase 프로젝트** | 로그인·회원가입 사용 중이면 URL 변경 필요 |

> **도메인이 아직 없다면** 먼저 구매해야 합니다. 아래 0단계를 참고하세요.

---

## 0단계 — 사전 준비: 도메인 소유

커스텀 도메인을 쓰려면 **본인 명의로 등록된 도메인**이 있어야 합니다.

### 어디서 살 수 있나 (국내·해외 예시)

| 업체 | 비고 |
|------|------|
| [Gabia](https://www.gabia.com) | 국내 `.co.kr`, `.kr` 등 |
| [Cafe24](https://www.cafe24.com) | 쇼핑몰·도메인 패키지 |
| [Hosting.kr](https://www.hosting.kr) | 국내 도메인 |
| [Namecheap](https://www.namecheap.com) | 해외, `.com` 저렴한 편 |
| [GoDaddy](https://www.godaddy.com) | 해외, 초보자 UI 친숙 |
| [Vercel Domains](https://vercel.com/docs/domains) | Vercel 대시보드에서 직접 구매 가능 |

### 도메인 이름 정하기 (팁)

- 짧고 기억하기 쉬운 이름 (예: `kbeautyshop.com`, `my-glow.kr`)
- **하이픈·숫자**는 가능하지만 말로 전달하기 어려울 수 있음
- `.com` 이 가장 익숙하지만 `.shop`, `.store`, `.co.kr` 도 사용 가능

### 비용·기간

- 보통 **연 1~2만 원대** (`.com` 기준, 업체마다 다름)
- 1년 단위 갱신 — 만료 전에 연장해야 사이트가 끊기지 않음

### 체크리스트

- [ ] 도메인 구매 완료
- [ ] 등록 업체 로그인 가능
- [ ] DNS 관리 메뉴 위치 확인 (보통 **DNS 설정**, **네임서버**, **Zone Editor** 등)

---

## 1단계 — Vercel에 도메인 추가

1. [vercel.com](https://vercel.com) 로그인
2. 프로젝트 **`k-beauty-shop`** 선택
3. 상단 **Settings** → 왼쪽 **Domains** 클릭
4. **Add** (또는 **Add Domain**) 버튼 클릭
5. 도메인 입력:
   - 루트(apex)만 쓸 때: `mykbeauty.com`
   - `www` 포함 권장: 먼저 `mykbeauty.com` 입력 → Vercel이 `www.mykbeauty.com` 추가를 안내할 수 있음
6. **Add** 확인

추가 직후 상태는 **Invalid Configuration**(빨간색)일 수 있습니다. DNS를 아직 안 넣었기 때문이며, 정상입니다.

### 다른 Vercel 계정에서 이미 쓰는 도메인인 경우

- Vercel이 **TXT 레코드**로 소유권 확인을 요청할 수 있습니다.
- Domains 화면에 표시된 TXT 값을 도메인 업체 DNS에 추가한 뒤, Vercel에서 **Refresh** 하세요.

---

## 2단계 — DNS 설정 (도메인 업체에서)

도메인을 **구매한 곳**(Gabia, Namecheap, GoDaddy 등)의 DNS 관리 화면에서 레코드를 추가합니다.  
Vercel Domains 탭에도 **동일한 값**이 표시되므로, 화면 안내와 아래 표를 함께 보면 됩니다.

> 공식 문서: [Adding & Configuring a Custom Domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain)

### 권장 구성: apex + www

| 용도 | 타입 | 호스트/이름 | 값(Value) | TTL |
|------|------|-------------|-----------|-----|
| 루트 도메인 (`mykbeauty.com`) | **A** | `@` (또는 비움) | `76.76.21.21` | 3600 (기본값) |
| www (`www.mykbeauty.com`) | **CNAME** | `www` | `cname.vercel-dns.com` | 3600 |

### 업체별 호스트 이름 예시

| 업체 | A 레코드 호스트 | CNAME 호스트 |
|------|-----------------|--------------|
| Namecheap | `@` | `www` |
| GoDaddy | `@` | `www` |
| Gabia | `@` 또는 `mykbeauty.com` | `www` |
| Cloudflare | `@` (프록시 **DNS only** 권장) | `www` |

### Vercel이 다른 CNAME을 보여주는 경우

2025년 이후 Vercel은 프로젝트마다 `xxxx.vercel-dns-017.com` 형태의 **전용 CNAME**을 안내하기도 합니다.

- **대시보드에 표시된 값을 우선** 사용하세요.
- `cname.vercel-dns.com` 과 `76.76.21.21` 은 **레거시 공용 값**으로, [Vercel 문서](https://vercel.com/docs/domains/set-up-custom-domain) 기준 계속 동작하지만 새 값 사용을 권장합니다.

### DNS 반영 시간

- 보통 **몇 분 ~ 48시간** (대부분 10~30분 내)
- Vercel **Domains** 탭에서 **Refresh** 로 상태 확인
- **Valid Configuration** + 초록 체크가 되면 SSL(HTTPS)도 자동 발급됩니다.

### 확인 명령 (선택, PowerShell)

```powershell
nslookup mykbeauty.com
nslookup www.mykbeauty.com
```

- apex: `76.76.21.21` 로 향하는지
- www: `cname.vercel-dns.com` (또는 Vercel 전용 CNAME) 으로 향하는지

---

## 3단계 — 브라우저에서 동작 확인

도메인이 Valid가 된 뒤:

| 확인 | URL |
|------|-----|
| 홈 | `https://www.mykbeauty.com/` (또는 apex) |
| 상품 | `https://www.mykbeauty.com/products` |
| 로그인 | `https://www.mykbeauty.com/login` |

- 주소창에 **자물쇠(HTTPS)** 표시
- 기존 `https://k-beauty-shop.vercel.app` 와 **같은 페이지**가 보이면 DNS·배포는 성공

> 이 프로젝트 푸터(`src/app/page.tsx`)의 **회사 소개**, **이용약관** 링크는 `/about`, `/terms` **상대 경로**라 도메인만 바뀌면 자동으로 새 주소에서 동작합니다. 별도 수정 불필요.

---

## 4단계 — Vercel 환경 변수 `NEXT_PUBLIC_APP_URL` 변경

Stripe 결제 완료/취소 URL 등에 쓰입니다.

### 코드에서 쓰이는 위치

| 파일 | 용도 |
|------|------|
| `src/lib/stripe.ts` → `getAppBaseUrl()` | Stripe Checkout `success_url`, `cancel_url` 생성 |
| `.env.local.example` | 로컬·배포 URL 템플릿 |

`NEXT_PUBLIC_APP_URL` 이 없으면 Vercel이 `VERCEL_URL`(`*.vercel.app`)로 대체하지만, **커스텀 도메인 사용 시 반드시 새 URL로 설정**하세요.

### 설정 방법

1. Vercel → **k-beauty-shop** → **Settings** → **Environment Variables**
2. `NEXT_PUBLIC_APP_URL` 찾기 (없으면 추가)
3. **Production** 값을 새 도메인으로 변경 (슬래시 없이):

```env
NEXT_PUBLIC_APP_URL=https://www.mykbeauty.com
```

4. **Save**

> apex만 쓸 경우 `https://mykbeauty.com` — **한 가지 주소로 통일**하는 것이 좋습니다 (www ↔ non-www 중 하나를 메인으로).

---

## 5단계 — Supabase Auth URL 변경

로그인·회원가입·비밀번호 재설정 링크가 새 도메인으로 돌아오게 합니다.

1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택
2. **Authentication** → **URL Configuration**
3. 아래처럼 수정 (`mykbeauty.com` 을 본인 도메인으로):

| 필드 | 값 예시 |
|------|---------|
| **Site URL** | `https://www.mykbeauty.com` |
| **Redirect URLs** | `https://www.mykbeauty.com/**` |
| | `https://mykbeauty.com/**` (apex도 쓸 때) |
| | `http://localhost:3000/**` (로컬 개발 유지) |

4. **Save**

### 테스트

- [ ] `/login` → 로그인 후 홈 또는 마이페이지로 정상 이동
- [ ] `/signup` → 가입 완료 후 리다이렉트 오류 없음
- [ ] 이메일 인증 링크(사용 시)가 새 도메인으로 열리는지

자세한 Supabase 클릭 순서: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md), [PHASE8.md](./PHASE8.md)

---

## 6단계 — Vercel Redeploy

환경 변수(`NEXT_PUBLIC_*`)는 **저장만으로는 반영되지 않습니다.** 재배포가 필요합니다.

1. Vercel → **k-beauty-shop** → **Deployments**
2. 최신 Production 배포 오른쪽 **⋯** → **Redeploy**
3. **Use existing Build Cache** 체크 해제 권장 (환경 변수 확실히 반영)
4. **Redeploy** 실행
5. 완료 후 `https://www.mykbeauty.com` 에서 결제·로그인 재테스트

### Stripe 사용 중이라면 (선택)

Webhook·Checkout도 새 도메인 기준으로 맞춥니다.

| 항목 | 변경 |
|------|------|
| Stripe Webhook URL | `https://www.mykbeauty.com/api/stripe/webhook` |
| Vercel `STRIPE_WEBHOOK_SECRET` | 엔드포인트 재생성 시 새 `whsec_...` 반영 후 Redeploy |

---

## 7단계 (선택) — `vercel.app` → 커스텀 도메인 리다이렉트

Vercel은 apex/www 간 기본 리다이렉트를 처리하지만, **`k-beauty-shop.vercel.app` 방문자를 커스텀 도메인으로내려면** 아래 중 하나를 쓸 수 있습니다.

### 방법 A — Vercel Domains UI (권장)

1. **Settings → Domains**
2. `k-beauty-shop.vercel.app` 옆 **⋯** → **Redirect to** → `https://www.mykbeauty.com` 선택

UI에서 설정하면 `vercel.json` 없이도 됩니다.

### 방법 B — `vercel.json` (프로젝트 루트)

> **현재 이 저장소에는 `vercel.json` 이 없습니다.** 필요할 때만 새로 만드세요.

프로젝트 루트에 `vercel.json` 생성 예시:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    {
      "source": "/:path*",
      "has": [
        {
          "type": "host",
          "value": "k-beauty-shop.vercel.app"
        }
      ],
      "destination": "https://www.mykbeauty.com/:path*",
      "permanent": true
    }
  ]
}
```

- `mykbeauty.com` → 본인 도메인으로 바꿀 것
- 커밋 후 push 하면 Vercel이 자동 재배포
- 문서: [vercel.json redirects](https://vercel.com/docs/projects/project-configuration/vercel-json#redirects)

---

## 전체 체크리스트

- [ ] 도메인 구매·DNS 관리 접근 가능
- [ ] Vercel Domains에 도메인 추가
- [ ] A 레코드 `76.76.21.21` (apex), CNAME `cname.vercel-dns.com` 또는 Vercel 안내값 (www)
- [ ] Domains 탭 **Valid Configuration**
- [ ] HTTPS로 사이트 열림
- [ ] `NEXT_PUBLIC_APP_URL` → 새 도메인
- [ ] Supabase Site URL + Redirect URLs 업데이트
- [ ] Vercel **Redeploy**
- [ ] 로그인·결제(Stripe) 동작 확인
- [ ] (선택) `vercel.app` → 커스텀 도메인 리다이렉트

---

## 문제 해결

| 증상 | 확인 |
|------|------|
| Invalid Configuration 오래 지속 | DNS TTL·전파 대기, 호스트명(`@`/`www`) 오타, 이전 A/CNAME 충돌 레코드 삭제 |
| SSL 인증서 대기 | DNS Valid 후 수분~수십 분, Domains에서 Refresh |
| 로그인 후 `vercel.app` 으로 돌아감 | Supabase Site URL·Redirect URLs, Vercel `NEXT_PUBLIC_APP_URL`, **Redeploy** |
| Stripe 결제 후 잘못된 URL | `NEXT_PUBLIC_APP_URL` 값·Redeploy |
| www ↔ apex 둘 다 안 됨 | 두 호스트 모두 Vercel Domains에 추가했는지, 각각 DNS 레코드 맞는지 |
| Cloudflare 사용 시 오류 | 프록시(주황 구름) 끄고 **DNS only**, 또는 [Vercel Cloudflare 가이드](https://vercel.com/docs/domains/troubleshooting) 참고 |

---

## 이 프로젝트 코드 참고 요약

| 항목 | 현재 상태 |
|------|-----------|
| `vercel.json` | **없음** — 리다이렉트는 Domains UI 또는 7단계에서 생성 |
| `src/app/page.tsx` 푸터 | `/about`, `/terms` 상대 링크 — 도메인 변경 시 수정 불필요 |
| `NEXT_PUBLIC_APP_URL` | `src/lib/stripe.ts` 의 `getAppBaseUrl()` 에서만 사용 (Stripe success/cancel URL) |
| 로컬 `.env.local` | `http://localhost:3000` 유지, Vercel Production만 새 도메인 |

---

## 다음 단계 (선택)

- Phase 7·8 문서의 Stripe Webhook·SEO 보강
- Google Search Console에 새 도메인 등록
- 이메일 발송 도메인(SPF/DKIM) — 뉴스레터·주문 알림 시

---

*Phase 11 · 커스텀 도메인 · 2026-06-18*
