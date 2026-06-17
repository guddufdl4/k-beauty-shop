# PHASE 8 - i18n 적용 가이드 (초급자용)

## 1) 이번 단계에서 한 일

- `next-intl` 라우팅 설정 정리 (`src/i18n/routing.ts`, `src/i18n/navigation.ts`, `src/i18n/request.ts`)
- `src/app/[locale]/layout.tsx` 추가 (`NextIntlClientProvider` 적용)
- 스토어 라우트를 `src/app/[locale]/(storefront)` 기준으로 통합
- 기존 `src/app/(storefront)` 라우트 제거
- 헤더/모바일 네비/홈/로그인/장바구니/푸터 텍스트를 번역 키로 연결
- 언어 전환 컴포넌트(`src/components/store/locale-switcher.tsx`) 추가

## 2) 핵심 구조 이해

### locale 기반 URL

- `/en/...`, `/ko/...`, `/ja/...`, `/zh/...` 형태로 페이지가 열립니다.
- 기본 언어는 `en`입니다.
- `/admin`은 locale prefix 없이 그대로 유지합니다.

### 번역 파일

- `messages/en.json`
- `messages/ko.json`
- `messages/ja.json`
- `messages/zh.json`

각 파일에 같은 키 구조를 유지해야 안전합니다.

## 3) 내부 링크 규칙

locale 페이지에서 내부 이동 링크는 `next/link` 대신 아래를 사용합니다.

- `@/i18n/navigation`의 `Link`

이렇게 해야 현재 언어를 유지한 채 페이지 이동이 됩니다.

## 4) 언어 전환기 사용법

`LocaleSwitcher`는 현재 경로를 유지한 상태에서 언어만 바꿉니다.

- 예: `/ko/products` -> 언어를 `en`으로 바꾸면 `/en/products`

## 5) 새 페이지 추가 시 체크리스트

1. 파일 위치를 `src/app/[locale]/(storefront)/...`에 생성
2. 내부 링크는 `@/i18n/navigation`의 `Link` 사용
3. 텍스트는 가능하면 `getTranslations(...)` 또는 `useTranslations(...)`로 연결
4. 필요한 번역 키를 `messages/*.json` 4개 언어 파일에 모두 추가

## 6) 문제 발생 시 빠른 점검

- 번역 키 오타 (`t("...")` 이름 확인)
- 4개 언어 JSON 키 불일치
- locale 페이지인데 `next/link`를 사용했는지 확인
- 라우트가 `src/app/[locale]` 하위에 있는지 확인

## 7) 배포 전 권장 확인

- `npm run build` 성공
- `/en`, `/ko/products`, `/ja/cart`, `/zh/login` 직접 접속 확인
- `/admin` 경로가 locale prefix 없이 정상 접근되는지 확인
