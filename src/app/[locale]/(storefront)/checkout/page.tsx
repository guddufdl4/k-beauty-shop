import { CheckoutForm } from "@/components/store/checkout-form";
import {
  calculateShippingCost,
  getCart,
  usesDatabaseCart,
} from "@/lib/cart";
import { getStripeStatusMessage, isStripeConfigured } from "@/lib/stripe";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const [cart, dbCart, params] = await Promise.all([
    getCart(),
    usesDatabaseCart(),
    searchParams,
  ]);
  const shippingCost = calculateShippingCost(cart.subtotal);
  const total = cart.subtotal + shippingCost;
  const stripeEnabled = isStripeConfigured();

  if (cart.items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold sm:text-3xl">寃곗젣</h1>
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center sm:p-10">
          <p className="text-zinc-600">?λ컮援щ땲媛 鍮꾩뼱 ?덉뼱 二쇰Ц?????놁뒿?덈떎.</p>
          <Link
            href="/cart"
            className="mt-4 inline-block py-3 text-sm text-rose-600 hover:underline"
          >
            ?λ컮援щ땲濡??대룞
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <Link href="/cart" className="text-sm text-rose-600 hover:underline">
        ???λ컮援щ땲
      </Link>
      <h1 className="mt-4 text-2xl font-bold sm:text-3xl">二쇰Ц / 寃곗젣</h1>
      {params.cancelled ? (
        <p className="mt-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          寃곗젣媛 痍⑥냼?섏뿀?듬땲?? ?ㅼ떆 ?쒕룄??二쇱꽭??
        </p>
      ) : null}
      <p className="mt-2 text-sm text-zinc-600">
        {dbCart
          ? "二쇰Ц? Supabase orders ?뚯씠釉붿뿉 ??λ맗?덈떎."
          : "?곕え 二쇰Ц? 荑좏궎????λ맗?덈떎. 濡쒓렇??+ Supabase ?곕룞 ??DB????λ맗?덈떎."}
      </p>
      <div className="mt-8">
        <CheckoutForm
          cart={cart}
          shippingCost={shippingCost}
          total={total}
          stripeEnabled={stripeEnabled}
          stripeMessage={getStripeStatusMessage()}
        />
      </div>
    </main>
  );
}

