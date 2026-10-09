"use client";
import Image from "next/image";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { addToCart, type CartActionState } from "@/app/actions/cart";
import { resolveProductImageUrl } from "@/lib/product-images";
import { getLocalizedProductName } from "@/lib/store/localized-product-name";
import { getCardDisplayPrice, isPricedStorefrontProduct, isProductSoldOut, getDisplayBrandName } from "@/lib/store/products-url";
import { formatLocaleProductPrice } from "@/lib/utils";
import type { StorefrontProduct } from "@/lib/supabase/products";
export function HomeCampaignProduct({product,locale,usdKrwRate,signInToViewPriceLabel}:{product:StorefrontProduct;locale:string;usdKrwRate:number;signInToViewPriceLabel:string}) {
 const t=useTranslations("cart");
 const labels=useTranslations("products");
 const [state,action,pending]=useActionState(addToCart,{} as CartActionState);
 const name=getLocalizedProductName(product,locale);
 const price=isPricedStorefrontProduct(product)?getCardDisplayPrice(product):null;
 return <article className="home-campaign-product" onPointerDown={() => window.dispatchEvent(new Event("hmt:pause-campaign"))} onMouseEnter={() => window.dispatchEvent(new Event("hmt:pause-campaign"))} onFocus={() => window.dispatchEvent(new Event("hmt:pause-campaign"))}>
  <Link prefetch={false} href={`/products/${product.slug}`} className="home-campaign-product-image"><Image src={resolveProductImageUrl(product)} alt={name} fill sizes="(max-width:640px) 35vw, 210px" quality={75} className="object-contain" /></Link>
  <div className="home-campaign-product-info"><p>{getDisplayBrandName(product.brand)}</p><Link prefetch={false} href={`/products/${product.slug}`}><h3>{name}</h3></Link>
  <div className="home-campaign-price">{price!==null?<div>{isPricedStorefrontProduct(product) && product.compare_at_price && product.compare_at_price > 1 ? <p className="text-xs font-normal text-zinc-500">{labels("retailPrice")} {formatLocaleProductPrice(product.compare_at_price,locale,usdKrwRate)}</p> : null}<p>{labels("wholesalePrice")} {formatLocaleProductPrice(price,locale,usdKrwRate)}</p></div>:<><svg aria-hidden width="20" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="10" width="14" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v4"/></svg>{signInToViewPriceLabel}</>}</div>
  <form action={action}><input type="hidden" name="productId" value={product.id}/><input type="hidden" name="quantity" value={Math.max(product.moq,1)}/><button disabled={pending||isProductSoldOut(product)}>{pending?t("adding"):isProductSoldOut(product)?t("outOfStock"):t("addToQuote")}</button><p role="status">{state.error||state.success}</p></form></div>
 </article>;
}
