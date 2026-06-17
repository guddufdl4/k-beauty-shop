import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 | K-Beauty Shop",
  description: "K-Beauty Shop 서비스 이용약관",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-rose-500">
        Legal
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
        이용약관
      </h1>
      <p className="mt-3 text-sm text-zinc-500">시행일: 2026년 6월 18일</p>

      <div className="prose prose-zinc mt-10 max-w-none text-sm leading-relaxed text-zinc-700">
        <p>
          본 약관은 K-Beauty Shop(이하 &quot;회사&quot;)이 제공하는 한국
          화장품 B2B·B2C 수출 쇼핑몰 서비스(이하 &quot;서비스&quot;)의 이용
          조건을 정합니다. 서비스를 이용하면 본 약관에 동의한 것으로
          간주합니다.
        </p>

        <h2 className="mt-8 text-base font-semibold text-zinc-900">
          제1조 (목적)
        </h2>
        <p>
          본 약관은 회사와 이용자 간 서비스 이용에 관한 권리·의무 및 책임
          사항을 규정함을 목적으로 합니다.
        </p>

        <h2 className="mt-8 text-base font-semibold text-zinc-900">
          제2조 (서비스 내용)
        </h2>
        <p>
          회사는 화장품 상품 정보 열람, 장바구니·주문, B2B 도매 문의 등
          전자상거래 관련 서비스를 제공합니다. 상품·가격·재고는 사전 고지
          없이 변경될 수 있습니다.
        </p>

        <h2 className="mt-8 text-base font-semibold text-zinc-900">
          제3조 (회원 가입)
        </h2>
        <p>
          이용자는 정확한 정보로 회원 가입해야 하며, 계정 보안은 이용자
          책임입니다. B2B 도매 등급·관리자 권한은 회사 승인 또는 내부
          정책에 따릅니다.
        </p>

        <h2 className="mt-8 text-base font-semibold text-zinc-900">
          제4조 (주문·결제·배송)
        </h2>
        <p>
          주문은 회사의 승인·재고 확인 후 확정됩니다. 결제는 Stripe 등
          회사가 지정한 결제 수단으로 진행되며, 해외 배송·통관·관세는
          별도 안내 또는 이용자 부담일 수 있습니다.
        </p>

        <h2 className="mt-8 text-base font-semibold text-zinc-900">
          제5조 (면책)
        </h2>
        <p>
          천재지변·시스템 장애 등 불가항력으로 인한 서비스 중단에 대해
          회사는 법령이 허용하는 범위 내에서 책임을 제한할 수 있습니다.
        </p>

        <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <strong>안내:</strong> 본 문서는 B2B 상업 사이트용 stub입니다.
          실제 운영 전 변호사·법무 검토 후{" "}
          <code className="rounded bg-white px-1">terms/page.tsx</code> 및
          개인정보처리방침을 작성·게시하세요.
        </div>
      </div>

      <div className="mt-12 flex flex-wrap gap-4">
        <Link
          href="/about"
          className="text-sm font-semibold text-rose-600 hover:underline"
        >
          회사 소개 →
        </Link>
        <Link
          href="/"
          className="text-sm font-semibold text-zinc-600 hover:underline"
        >
          홈으로
        </Link>
      </div>
    </main>
  );
}
