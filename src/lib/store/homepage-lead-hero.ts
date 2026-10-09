import type { HeroSlide } from "@/types/database";
import {
  DEFAULT_HERO_DESKTOP_LAYOUT,
  DEFAULT_HERO_MOBILE_LAYOUT,
} from "@/lib/admin/hero-image-spec";
import { DEFAULT_ORDER_GUIDE_HREF } from "@/lib/store/storefront-href";

export const HOMEPAGE_LEAD_HERO_SLIDE_ID = "lead-wholesale-order-guide";
export const HOMEPAGE_LEAD_HERO_IMAGE = "/hero/korean-cosmetics-wholesale-v7.jpg";
export const HOMEPAGE_LEAD_HERO_IMAGE_WIDTH = 1920;
export const HOMEPAGE_LEAD_HERO_IMAGE_HEIGHT = 600;

export const HOMEPAGE_LEAD_HERO_COPY = {
  badge: "WHOLESALE",
  title: "Korean Cosmetics Wholesale",
  subtitle: "Authentic products · Flexible MOQ · Export-ready supply",
  button_text: "Order guide",
  button_link: DEFAULT_ORDER_GUIDE_HREF,
  wholesale_label: "",
  order_guide_label: "",
} as const;

export function createHomepageLeadHeroSlide(): HeroSlide {
  return {
    id: HOMEPAGE_LEAD_HERO_SLIDE_ID,
    image_url: HOMEPAGE_LEAD_HERO_IMAGE,
    order: 0,
    copy: { ...HOMEPAGE_LEAD_HERO_COPY },
    layout: {
      desktop: {
        ...DEFAULT_HERO_DESKTOP_LAYOUT,
        gradientStrength: 42,
        imageFocus: "right",
      },
      mobile: {
        ...DEFAULT_HERO_MOBILE_LAYOUT,
        gradientStrength: 48,
        imageFocus: "center",
      },
    },
  };
}

export function withHomepageLeadHeroSlide(slides: HeroSlide[]): HeroSlide[] {
  // Configured campaigns are authoritative so admins can replace them monthly.
  if (slides.length > 0) {
    return [...slides].sort((a, b) => a.order - b.order).map((slide, order) => ({ ...slide, order }));
  }
  const lead = createHomepageLeadHeroSlide();
  const rest = slides.filter((slide) => slide.id !== lead.id);
  return [lead, ...rest].map((slide, index) => ({ ...slide, order: index }));
}
