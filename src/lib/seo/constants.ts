export const SEO_BRAND_NAME = "HMT KOREA";

export const INDEX_FOLLOW = {
  index: true,
  follow: true,
} as const;

export const NOINDEX_FOLLOW = {
  index: false,
  follow: true,
} as const;

export const NOINDEX_NOFOLLOW = {
  index: false,
  follow: false,
} as const;