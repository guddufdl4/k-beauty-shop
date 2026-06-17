import { Link } from "@/i18n/navigation";

/** 배포 전 본인 회사명으로 수정하세요 */
const COMPANY_NAME = "(주)케이뷰티글로벌";

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-sm font-medium uppercase tracking-widest text-rose-500">About Us</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">회사 소개</h1>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-600 sm:text-base">
        <p>
          <strong className="text-zinc-900">{COMPANY_NAME}</strong>은 한국 무역회사의 자회사로,
          K-뷰티 제품의 <strong className="text-zinc-900">B2B 수출·도매</strong>와 해외 소비자 대상
          <strong className="text-zinc-900"> B2C 소매</strong>를 지원하는 수출 전문 플랫폼입니다.
        </p>
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
  );
}
