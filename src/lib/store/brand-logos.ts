import { brandNameToSlug } from "@/lib/store/brand-url";
import { normalizeBrandKey } from "@/lib/store/products-url";

/** Verified brand marks and retailer brand visuals — local assets in public/brands/logos/; provenance in public/brands/logo-sources.json. */
export const OFFICIAL_BRAND_LOGO_BY_SLUG: Readonly<Record<string, string>> = {
  "2an": "/brands/logos/2an-verified.png",
  "3ce": "/brands/logos/3ce.svg",
  "9wishes": "/brands/logos/9wishes-verified.png",
  "abib": "/brands/logos/abib-verified.png",
  "acwell": "/brands/logos/acwell-verified.png",
  "aestura": "/brands/logos/aestura-verified.png",
  "anua": "/brands/logos/anua.svg",
  "apeiu": "/brands/logos/apeiu-verified.png",
  "april-skin": "/brands/logos/april-skin-verified.png",
  "arencia": "/brands/logos/arencia.png",
  "ariul": "/brands/logos/ariul.jpg",
  "aromatica": "/brands/logos/aromatica-verified.png",
  "atopalm": "/brands/logos/atopalm.svg",
  "axis-y": "/brands/logos/axis-y-verified.png",
  "banila-co": "/brands/logos/banila-co-verified.png",
  "beauty-of-joseon": "/brands/logos/beauty-of-joseon-verified.png",
  "benton": "/brands/logos/benton-verified.png",
  "beplain": "/brands/logos/beplain-verified.png",
  "biodance": "/brands/logos/biodance-verified.png",
  "bioheal-boh": "/brands/logos/bioheal-boh-verified.png",
  "black-rouge": "/brands/logos/black-rouge.png",
  "bringgreen": "/brands/logos/bringgreen-verified.png",
  "bywishtrend": "/brands/logos/bywishtrend-verified.png",
  "centellian": "/brands/logos/centellian-verified.png",
  "chosungah": "/brands/logos/chosungah-verified.png",
  "clio": "/brands/logos/clio-verified.png",
  "colorgram": "/brands/logos/colorgram-verified.png",
  "cosrx": "/brands/logos/cosrx.png",
  "daenggimeori": "/brands/logos/daenggimeori-verified.png",
  "dalba": "/brands/logos/dalba-verified.png",
  "dasique": "/brands/logos/dasique-verified.png",
  "dear-klairs": "/brands/logos/dear-klairs-verified.png",
  "dermab": "/brands/logos/dermab-verified.png",
  "dermaline": "/brands/logos/dermaline-verified.png",
  "dinto": "/brands/logos/dinto-verified.png",
  "dralthea": "/brands/logos/dralthea-verified.png",
  "drforhair": "/brands/logos/drforhair-verified.png",
  "drg": "/brands/logos/drg-verified.png",
  "drgroot": "/brands/logos/drgroot-verified.png",
  "drjart": "/brands/logos/drjart-verified.png",
  "drmelaxin": "/brands/logos/drmelaxin-verified.png",
  "drseed": "/brands/logos/drseed-verified.png",
  "elishacoy": "/brands/logos/elishacoy-verified.png",
  "elizavecca": "/brands/logos/elizavecca-verified.png",
  "elroel": "/brands/logos/elroel-verified.png",
  "entropy": "/brands/logos/entropy-verified.png",
  "etude-house": "/brands/logos/etude-house-verified.png",
  "farmstay": "/brands/logos/farmstay-verified.png",
  "fillimilli": "/brands/logos/fillimilli-verified.png",
  "fullyobge": "/brands/logos/fullyobge-verified.png",
  "fwee": "/brands/logos/fwee-verified.png",
  "genabelle": "/brands/logos/genabelle-verified.png",
  "grafen": "/brands/logos/grafen-verified.png",
  "growus": "/brands/logos/growus-verified.png",
  "haraharu-wonder": "/brands/logos/haraharu-wonder-verified.png",
  "heimish": "/brands/logos/heimish-verified.png",
  "hetras": "/brands/logos/hetras-verified.png",
  "hince": "/brands/logos/hince-verified.png",
  "holikaholika": "/brands/logos/holikaholika-verified.png",
  "house-of-hur": "/brands/logos/house-of-hur-verified.png",
  "huxley": "/brands/logos/huxley-verified.png",
  "ilso": "/brands/logos/ilso-verified.png",
  "imfrom": "/brands/logos/imfrom-verified.png",
  "innisfree": "/brands/logos/innisfree-verified.png",
  "isntree": "/brands/logos/isntree-verified.png",
  "isoi": "/brands/logos/isoi-verified.png",
  "itsskin": "/brands/logos/itsskin-verified.png",
  "iunik": "/brands/logos/iunik-verified.png",
  "jdew": "/brands/logos/jdew-verified.png",
  "jigott": "/brands/logos/jiggot-verified.png",
  "jm-solution": "/brands/logos/jm-solution-verified.png",
  "jm-solution-heartleaf": "/brands/logos/jm-solution-heartleaf-verified.png",
  "jm-solution-skin-boost": "/brands/logos/jm-solution-skin-boost-verified.png",
  "jmella": "/brands/logos/jmella-verified.png",
  "jumiso": "/brands/logos/jumiso-verified.png",
  "kahi": "/brands/logos/kahi-verified.png",
  "kerasys": "/brands/logos/kerasys-verified.png",
  "klavuu": "/brands/logos/klavuu-verified.png",
  "ksecret": "/brands/logos/ksecret-verified.png",
  "kundal": "/brands/logos/kundal-verified.png",
  "laka": "/brands/logos/laka-verified.png",
  "laneige": "/brands/logos/laneige-verified.png",
  "lindsay": "/brands/logos/lindsay-verified.png",
  "luna": "/brands/logos/luna-verified.png",
  "luvum": "/brands/logos/luvum-verified.png",
  "manyo": "/brands/logos/manyo-verified.png",
  "marymay": "/brands/logos/marymay-verified.png",
  "masil": "/brands/logos/masil-verified.png",
  "medicube": "/brands/logos/medicube-verified.png",
  "mediflower": "/brands/logos/mediflower-verified.png",
  "mediheal": "/brands/logos/mediheal-verified.png",
  "medipeel": "/brands/logos/medipeel-verified.png",
  "menokin": "/brands/logos/menokin-verified.png",
  "missha": "/brands/logos/missha-verified.png",
  "mixsoon": "/brands/logos/mixsoon-verified.png",
  "needly": "/brands/logos/needly-verified.png",
  "neogen": "/brands/logos/neogen-verified.png",
  "numbuzin": "/brands/logos/numbuzin-verified.png",
  "one-thing": "/brands/logos/one-thing-verified.png",
  "ongredients": "/brands/logos/ongredients-verified.png",
  "ootd": "/brands/logos/ootd-verified.png",
  "parnell": "/brands/logos/parnell-verified.png",
  "phytopecia": "/brands/logos/phytopecia-verified.png",
  "purito": "/brands/logos/purito-verified.png",
  "pyung-kang-yul": "/brands/logos/pyung-kang-yul-verified.png",
  "rejuall": "/brands/logos/rejuall-verified.png",
  "rejuran": "/brands/logos/rejuran-verified.png",
  "rep": "/brands/logos/rep-verified.png",
  "romnd": "/brands/logos/romnd-verified.png",
  "round-lab": "/brands/logos/round-lab.png",
  "rovectin": "/brands/logos/rovectin-verified.png",
  "ryo": "/brands/logos/ryo-verified.png",
  "s-nature": "/brands/logos/s-nature-verified.png",
  "skin1004": "/brands/logos/skin1004-verified.png",
  "skinfood": "/brands/logos/skinfood.svg",
  "so-natural": "/brands/logos/so-natural-verified.png",
  "somebymi": "/brands/logos/somebymi-verified.png",
  "sulwhasoo": "/brands/logos/sulwhasoo-verified.png",
  "sum37": "/brands/logos/sum37-verified.png",
  "sungbooneditor": "/brands/logos/sungbooneditor-verified.png",
  "surmedic": "/brands/logos/surmedic-verified.png",
  "teazen": "/brands/logos/teazen-verified.png",
  "tenzero": "/brands/logos/tenzero-verified.png",
  "tfit": "/brands/logos/tfit-verified.png",
  "thankyoufarmer": "/brands/logos/thankyoufarmer-verified.png",
  "the-history-of-whoo": "/brands/logos/the-history-of-whoo-verified.png",
  "the-lab-by-blanc-doux": "/brands/logos/the-lab-by-blanc-doux-verified.png",
  "the-ordinary": "/brands/logos/the-ordinary-verified.png",
  "the-saem": "/brands/logos/the-saem-verified.png",
  "thefaceshop": "/brands/logos/thefaceshop-verified.png",
  "tiam": "/brands/logos/tiam-verified.png",
  "tirtir": "/brands/logos/tirtir-verified.png",
  "tonymoly": "/brands/logos/tonymoly-verified.png",
  "torriden": "/brands/logos/torriden.svg",
  "unove": "/brands/logos/unove-verified.png",
  "vt": "/brands/logos/vt.png",
  "wdressroom": "/brands/logos/wdressroom-verified.png",
  "wellage": "/brands/logos/wellage-verified.png",
  "wellderma": "/brands/logos/wellderma-verified.png",
  "whipped": "/brands/logos/whipped-verified.png",
};

export function getStaticBrandLogoUrl(slug: string): string | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return OFFICIAL_BRAND_LOGO_BY_SLUG[normalized] ?? null;
}

export function resolveBrandLogo(options: {
  slug?: string;
  displayName: string;
  filterBrand: string;
  dbLogoMap: Map<string, string>;
}): string | null {
  const { slug, displayName, filterBrand, dbLogoMap } = options;

  const slugKey = (slug ?? brandNameToSlug(displayName)).trim().toLowerCase();
  const local = getStaticBrandLogoUrl(slugKey);
  if (local) return local;

  const fromDb =
    dbLogoMap.get(normalizeBrandKey(displayName)) ??
    dbLogoMap.get(normalizeBrandKey(filterBrand));
  if (fromDb) {
    return fromDb;
  }

  return null;
}
