import { Link } from "@/i18n/navigation";

const COMPANY_NAME = "(주)케이뷰티글로벌";

export default function AboutPage() {
  return (
    <>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-sm font-medium uppercase tracking-widest text-rose-500">
          About Us
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
          회사 소개
        </h1>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-600 sm:text-base">
          <p>
            <strong className="text-zinc-900">{COMPANY_NAME}</strong>은 한국 무역회사의
            자회사로, K-뷰티(스킨케어·메이크업) 제품의
            <strong className="text-zinc-900"> B2B 수출·도매</strong>와 해외 소비자 대상
            <strong className="text-zinc-900"> B2C 소매</strong>를 지원하는 수출 전문 플랫폼입니다.
          </p>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900">사업 영역</h2>
            <ul className="mt-3 list-inside list-disc space-y-2">
              <li>한국 화장품 브랜드 해외 바이어 매칭 및 도매 공급</li>
              <li>MOQ·도매가 기준 B2B 주문·재고 관리</li>
              <li>해외 소비자 대상 온라인 소매·배송 연계</li>
              <li>수출 서류·통관·물류 파트너 연계 (협의)</li>
            </ul>
          </section>
        </div>

        <div className="mt-10">
          <Link
            href="/products"
            className="inline-flex items-center rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
          >
            상품 보기
          </Link>
        </div>
      </main>
    </>
  );
}