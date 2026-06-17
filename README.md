# K-Beauty Shop

한국 화장품(K-Beauty) **B2C·B2B** 이커머스 플랫폼입니다.  
Next.js App Router + Supabase(PostgreSQL) 기반으로 구축합니다.

## Phase 1 완료

스캐폴드, 라우트 구조, DB 스키마 설계가 완료되었습니다.  
**상세 기획·페이지 맵·ERD·Phase 2 범위는 아래 문서를 참고하세요.**

👉 **[docs/PHASE1.md](./docs/PHASE1.md)** · 배포: **[docs/PHASE7.md](./docs/PHASE7.md)**

## 빠른 시작

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

## 주요 경로

| 구분 | URL |
|------|-----|
| 홈 | `/` |
| 카테고리 | `/categories` |
| 상품 | `/products`, `/products/[slug]` |
| 장바구니 | `/cart` |
| 결제 | `/checkout` |
| 마이페이지 | `/account` |
| 관리자 | `/admin`, `/admin/products`, `/admin/orders` |

## DB 스키마

Supabase용 DDL: [`supabase/schema.sql`](./supabase/schema.sql)

## 기술 스택

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Database:** Supabase PostgreSQL (Phase 2 연동 예정)

## 다음 단계

Phase 1 검토 후 **"Phase 2 진행"** 으로 회신해 주시면 Supabase Auth·RLS·UI 구현을 시작합니다.
