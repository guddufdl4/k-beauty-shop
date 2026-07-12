export const dynamic = "force-dynamic";

import Link from "next/link";
import { ProductImageBatchSection } from "@/components/admin/product-image-batch-section";
import { getProductImageBatchStats } from "@/lib/admin/product-image-batch";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createSafeClient } from "@/lib/supabase/safe-server";

type FillRunRow = {
  id: string;
  batch_number: number;
  processed_count: number;
  remaining_count: number;
  from_source_row: number;
  from_category_image: number;
  from_placeholder: number;
  status: string;
  created_at: string;
};

export default async function AdminProductImagesPage() {
  const { configured, user, profile } = await getSessionProfile();

  if (!configured) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900">
          {"\uad00\ub9ac\uc790 \u00b7 \uc0c1\ud488 \uc774\ubbf8\uc9c0 \ubc30\uce58"}
        </h1>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {"Supabase\uac00 \uc124\uc815\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4."}
        </p>
      </main>
    );
  }

  if (!user || profile?.role !== "admin") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900">
          {"\uad00\ub9ac\uc790 \u00b7 \uc0c1\ud488 \uc774\ubbf8\uc9c0 \ubc30\uce58"}
        </h1>
        <p className="mt-4 text-zinc-600">
          {"\uad00\ub9ac\uc790 \uad8c\ud55c\uc774 \ud544\uc694\ud569\ub2c8\ub2e4."}
        </p>
      </main>
    );
  }

  const supabase = await createSafeClient();
  let stats = null;
  let runs: FillRunRow[] = [];

  if (supabase) {
    const result = await getProductImageBatchStats(supabase);
    stats = result.stats;

    const { data } = await supabase
      .from("product_image_fill_runs")
      .select("*")
      .order("batch_number", { ascending: false })
      .limit(20);

    runs = (data ?? []) as FillRunRow[];
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-violet-500">
            Admin
          </p>
          <h1 className="mt-1 text-3xl font-bold text-zinc-900">
            {"\uc0c1\ud488 \uc774\ubbf8\uc9c0 \ubc30\uce58"}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {
              "Hanmi import \ud6c4 \uc774\ubbf8\uc9c0\uac00 \uc5c6\ub294 \uc0c1\ud488\uc744 1,000\uac1c\uc529 \ucc44\uc6c0\ub2c8\ub2e4."
            }
          </p>
        </div>
        <Link
          href="/admin/products"
          className="text-sm text-zinc-500 hover:text-violet-600"
        >
          {"\u2190 \uc0c1\ud488 \uad00\ub9ac"}
        </Link>
      </div>

      <ProductImageBatchSection initialStats={stats} />

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h2 className="font-semibold text-zinc-900">
            {"\ucd5c\uadfc \ubc30\uce58 \uc774\ub825"}
          </h2>
        </div>
        <div className="divide-y divide-zinc-100">
          {runs.length === 0 ? (
            <p className="px-6 py-8 text-sm text-zinc-500">
              {"\uc544\uc9c1 \uc2e4\ud589 \uc774\ub825\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."}
            </p>
          ) : (
            runs.map((run) => (
              <div key={run.id} className="px-6 py-4 text-sm">
                <p className="font-medium text-zinc-900">
                  {"\ubc30\uce58 #"}
                  {run.batch_number}
                  {" \u00b7 "}
                  {run.processed_count}
                  {"\uac1c \ucc98\ub9ac"}
                </p>
                <p className="mt-1 text-zinc-500">
                  {new Date(run.created_at).toLocaleString("ko-KR")}
                  {" \u00b7 Excel "}
                  {run.from_source_row}
                  {" \u00b7 \uce74\ud14c\uace0\ub9ac "}
                  {run.from_category_image}
                  {" \u00b7 \ud50c\ub808\uc774\uc2a4\ud640\ub354 "}
                  {run.from_placeholder}
                  {" \u00b7 \ub0a8\uc74c "}
                  {run.remaining_count.toLocaleString("ko-KR")}
                  {" \u00b7 "}
                  {run.status}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-amber-100 bg-amber-50 px-6 py-5 text-sm text-amber-900">
        <h2 className="font-semibold">
          {"\uc218\ub3d9 \uc5c5\uadf8\ub808\uc774\ub4dc \uc548\ub0b4"}
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            {
              "Hanmi Excel\uc5d0 \uc774\ubbf8\uc9c0 URL \uceec\ub7fc(\ub300\ud45c\uc774\ubbf8\uc9c0/\uc774\ubbf8\uc9c0/image)\uc774 \uc788\uc73c\uba74 import \uc2dc source_row\uc5d0 \uc800\uc7a5\ub418\uba70, \ubc30\uce58\uac00 \uc6b0\uc120 \uc0ac\uc6a9\ud569\ub2c8\ub2e4."
            }
          </li>
          <li>
            {
              "\ub300\ubd80\ubd84 \uc0c1\ud488\uc740 \uce74\ud14c\uace0\ub9ac\ubcc4 \ud50c\ub808\uc774\uc2a4\ud640\ub354\uac00 \ud560\ub2f9\ub429\ub2c8\ub2e4. \uc2e4\uc81c \uc81c\ud488 \uc0ac\uc9c4\uc740 \uc0c1\ud488 \ud3b8\uc9d1 \ub610\ub294 CDN \uc5c5\ub85c\ub4dc \ud6c4 image_url / product_images\ub97c \uad50\uccb4\ud558\uc138\uc694."
            }
          </li>
          <li>
            {
              "\uc790\ub3d9 \uc6f9 \uac80\uc0c9(\ube0c\ub79c\ub4dc+\uc0c1\ud488\uba85)\uc740 \uc800\uc791\uad8c\u00b7\uc815\ud655\ub3c4 \ubb38\uc81c\ub85c \ud3ec\ud568\ud558\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4."
            }
          </li>
        </ul>
      </section>
    </main>
  );
}
