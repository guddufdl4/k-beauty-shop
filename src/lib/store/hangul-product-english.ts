const HANGUL = /[\u3131-\u318e\uac00-\ud7a3]/;

const LOANWORDS: Array<[string, string]> = [
  ["\ud558\uc774\ud3ec\ud074\ub85c\ub85c\uc2a4\uc560\uc528\ub4dc", "Hypochlorous Acid"],
  ["\ucf54\uc9c1\uc560\uc528\ub4dc", "Kojic Acid"],
  ["\ubca0\ub7ec\ub304\ud314\ub808\ud2b8", "Better Than Palette"],
  ["\ubca0\ub7ec\ub304\uce58\ud06c", "Better Than Cheek"],
  ["\uc96c\uc2dc\ub798\uc2a4\ud305\ud2f4\ud2b8", "Juicy Lasting Tint"],
  ["\uc81c\ub85c\ubca8\ubcb3\ud2f4\ud2b8", "Zero Velvet Tint"],
  ["\uae00\ub798\uc2a4\ud305\uc6cc\ud130\ud2f4\ud2b8", "Glasting Water Tint"],
  ["\uae00\ub798\uc2a4\ud305\uceec\ub7ec\uae00\ub85c\uc2a4", "Glasting Color Gloss"],
  ["\ud37c\ud399\ud2b8\ucee4\ubc84", "Perfect Cover"],
  ["\uc2dc\ud2b8\ub9c8\uc2a4\ud06c", "Sheet Mask"],
  ["\uc120\ud06c\ub9bc", "Sunscreen"],
  ["\uc120\uc2a4\ud2f1", "Sun Stick"],
  ["\ud074\ub80c\uc9d5\ud3fc", "Cleansing Foam"],
  ["\ud074\ub80c\uc9d5\uc624\uc77c", "Cleansing Oil"],
  ["\ud074\ub80c\uc9d5", "Cleansing"],
  ["\ube0c\ub77c\uc774\ud2b8\ub2dd", "Brightening"],
  ["\uc2a4\ud2b8\ub85c\ubca0\ub9ac", "Strawberry"],
  ["\uc560\ud504\ub9ac\ucf67", "Apricot"],
  ["\ube14\ub8e8\ubca0\ub9ac\uce69", "Blueberry Chip"],
  ["\ube14\ub8e8\ubca0\ub9ac", "Blueberry"],
  ["\ud558\uc774\ud3ec\ud074\ub85c\ub85c\uc2a4", "Hypochlorous"],
  ["\ubca0\ub7ec\ub304", "Better Than"],
  ["\ub798\uc2a4\ud305", "Lasting"],
  ["\uae00\ub798\uc2a4\ud305", "Glasting"],
  ["\uc6cc\ud130\ud2f4\ud2b8", "Water Tint"],
  ["\ubca8\ubcb3\ud2f4\ud2b8", "Velvet Tint"],
  ["\uceec\ub7ec\uae00\ub85c\uc2a4", "Color Gloss"],
  ["\uc544\uc774\ud328\uce58", "Eye Patch"],
  ["\ud398\uc774\uc15c", "Facial"],
  ["\uc2a4\ud504\ub808\uc774", "Spray"],
  ["\uc194\ub8e8\uc158", "Solution"],
  ["\uc5d0\uc13c\uc2a4", "Essence"],
  ["\uc138\ub7fc", "Serum"],
  ["\uc570\ud50c", "Ampoule"],
  ["\ud1a0\ub108", "Toner"],
  ["\ud06c\ub9bc", "Cream"],
  ["\ub85c\uc158", "Lotion"],
  ["\ub9c8\uc2a4\ud06c", "Mask"],
  ["\ud314\ub808\ud2b8", "Palette"],
  ["\uba54\uc774\ud06c\uc5c5", "Makeup"],
  ["\uc2a4\ud0a8", "Skin"],
  ["\uc624\uc77c", "Oil"],
  ["\ubbf8\uc2a4\ud2b8", "Mist"],
  ["\ucfe0\uc158", "Cushion"],
  ["\ud2f4\ud2b8", "Tint"],
  ["\uce58\ud06c", "Cheek"],
  ["\uae00\ub85c\uc2a4", "Gloss"],
  ["\ub77c\uc774\ub108", "Liner"],
  ["\ub9c8\uc2a4\uce74\ub77c", "Mascara"],
  ["\ud30c\uc6b4\ub370\uc774\uc158", "Foundation"],
  ["\ucee8\uc2e4\ub7ec", "Concealer"],
  ["\ud504\ub77c\uc774\uba38", "Primer"],
  ["\ud30c\uc6b0\ub354", "Powder"],
  ["\ube14\ub7ec\uc154", "Blusher"],
  ["\ud558\uc774\ub77c\uc774\ud130", "Highlighter"],
  ["\ube0c\ub85c\uc6b0", "Brow"],
  ["\uc100\ub3c4\uc6b0", "Shadow"],
  ["\ud1a0\uc2a4\ud2b8", "Toast"],
  ["\ud0dc\ub2c8", "Tawny"],
  ["\uac00\ub4e0", "Garden"],
  ["\ud53c\uce58\uce69", "Peach Chip"],
  ["\ud53c\uadf8\uce69", "Fig Chip"],
  ["\ud398\uc5b4\uce69", "Pear Chip"],
  ["\ud53c\uce58", "Peach"],
  ["\uce69", "Chip"],
  ["\ud53c\uadf8", "Fig"],
  ["\ud398\uc5b4", "Pear"],
  ["\uc624\ub514", "Mulberry"],
  ["\ubc00\ud06c", "Milk"],
  ["\ub108\ud2f0", "Nutty"],
  ["\ub204\ub4dc", "Nude"],
  ["\ubc14\uc778", "Vine"],
  ["\ub9dd\uace0", "Mango"],
  ["\ub9ac\uce58", "Lychee"],
  ["\ud130\uba54\ub9ad", "Turmeric"],
  ["\uac94", "Gel"],
  ["\uc824", "Gel"],
  ["\uc560\uc528\ub4dc", "Acid"],
  ["\uc218\ub529", "Soothing"],
  ["\ud558\uc774\ub4dc\ub77c", "Hydra"],
  ["\ub9c8\uc77c\ub4dc", "Mild"],
  ["\ub370\uc77c\ub9ac", "Daily"],
  ["\ub808\ud2f0\ub180", "Retinol"],
  ["\ucf5c\ub77c\uac90", "Collagen"],
  ["\ud53c\ub514\uc54c\uc5d4", "PDRN"],
  ["\ub098\uc774\uc544\uc2e0\uc544\ub9c8\uc774\ub4dc", "Niacinamide"],
  ["\ud788\uc54c\ub8e8\ub860", "Hyaluron"],
  ["\ud3a9\ud0c0\uc774\ub4dc", "Peptide"],
  ["\uc138\ub77c\ub9c8\uc774\ub4dc", "Ceramide"],
  ["\ud310\ud14c\ub180", "Panthenol"],
  ["\uc13c\ud154\ub77c", "Centella"],
  ["\ud2f0\ud2b8\ub9ac", "Tea Tree"],
  ["\ube44\ud0c0\ubbfc", "Vitamin"],
  ["\uce74\ud398\uc778", "Caffeine"],
  ["\ud504\ub85c", "Pro"],
  ["\uc6cc\ud130", "Water"],
  ["\ub9e4\ud2b8", "Matte"],
  ["\uae00\ub85c\uc6b0", "Glow"],
  ["\ubaa8\uc774\uc2a4\ud2b8", "Moist"],
  ["\ubc38\ub7f0\uc2f1", "Balancing"],
  ["\uce74\ubc0d", "Calming"],
  ["\ub9ac\ud398\uc5b4", "Repair"],
  ["\ub9ac\ub274\uc5bc", "Renewal"],
  ["\uc778\ud150\uc2a4", "Intense"],
  ["\ub77c\uc774\ud2b8", "Light"],
  ["\ub525", "Deep"],
  ["\ud4e8\uc5b4", "Pure"],
  ["\uc624\ub9ac\uc9c0\ub110", "Original"],
  ["\ud074\ub798\uc2dd", "Classic"],
  ["\ubbf8\ub2c8", "Mini"],
  ["\uc138\ud2b8", "Set"],
  ["\ud0a4\ud2b8", "Kit"],
  ["\ud329", "Pack"],
  ["\ubc24", "Balm"],
  ["\uc2a4\ud2f1", "Stick"],
  ["\ud328\uce58", "Patch"],
  ["\ud328\ub4dc", "Pad"],
  ["\ud1a0\ub108\ud328\ub4dc", "Toner Pad"],
  ["\uc120\uc138\ub7fc", "Sun Serum"],
  ["\ube44\ube44", "BB"],
  ["\uc528\uc528", "CC"],
  ["\ub9e4\uc785", "EA"],
  ["\uac1c\uc785", "EA"],
  ["\ub86c\uc564", "Rom&nd"],
  ["\ubbf8\uc0e4", "Missha"],
  ["\uc774\ub2c8\uc2a4\ud504\ub9ac", "Innisfree"],
  ["\uba54\ub514\ud050\ube0c", "Medicube"],
  ["\ub2e5\ud130\uc790\ub974\ud2b8", "Dr.Jart+"],
  ["\ucf54\uc2a4\uc54c\uc5d1\uc2a4", "COSRX"],
  ["\uc544\ub204\uc544", "Anua"],
  ["\ub77c\uc6b4\ub4dc\ub7a9", "ROUND LAB"],
  ["\uc2a4\ud0a8\ud478\ub4dc", "SKINFOOD"],
  ["\ud1a0\ub9ac\ub4e0", "Torriden"],
  ["\ub77c\ub124\uc988", "Laneige"],
  ["\ub9c8\ub140\uacf5\uc7a5", "Manyo"]
];

const SORTED_LOANWORDS = [...LOANWORDS].sort((a, b) => b[0].length - a[0].length);

const CHO = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const JUNG = [
  "a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo",
  "u", "wo", "we", "wi", "yu", "eu", "ui", "i",
];
const JONG = [
  "", "k", "k", "ks", "n", "nj", "nh", "t", "l", "lk", "lm", "lb", "ls", "lt", "lp", "lh",
  "m", "p", "ps", "t", "t", "ng", "t", "t", "k", "t", "p", "t",
];

function isHangulChar(char: string): boolean {
  return HANGUL.test(char);
}

function romanizeSyllable(char: string): string {
  const code = char.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) {
    return char;
  }
  const cho = Math.floor(code / 588);
  const jung = Math.floor((code % 588) / 28);
  const jong = code % 28;
  const text = `${CHO[cho] ?? ""}${JUNG[jung] ?? ""}${JONG[jong] ?? ""}`;
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : char;
}

function glueHangul(text: string): string {
  return text.replace(/([\uac00-\ud7a3])\s+(?=[\uac00-\ud7a3])/g, "$1");
}

function convertHangulRun(run: string): string {
  let index = 0;
  const parts: string[] = [];
  while (index < run.length) {
    let matched = false;
    for (const [hangul, english] of SORTED_LOANWORDS) {
      if (run.startsWith(hangul, index)) {
        parts.push(english);
        index += hangul.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      parts.push(romanizeSyllable(run[index] ?? ""));
      index += 1;
    }
  }
  return parts.join(" ");
}

function extractLatinProductName(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const chunks = trimmed.split(/[\r\n/]+/).map((part) => part.trim()).filter(Boolean);
  const latin = chunks.filter((part) => /[A-Za-z]/.test(part) && !HANGUL.test(part));
  if (latin.length > 0) {
    return latin.reduce((best, current) => (current.length > best.length ? current : best));
  }
  return null;
}

export function hangulProductNameToEnglish(name: string, brand?: string | null): string {
  const mixedLatin = extractLatinProductName(name);
  if (mixedLatin && mixedLatin.split(/\s+/).length >= 2) {
    return mixedLatin.replace(/\s+/g, " ").trim();
  }

  const glued = glueHangul(name.replace(/\s+/g, " ").trim());
  const pieces: string[] = [];
  let index = 0;
  while (index < glued.length) {
    const char = glued[index] ?? "";
    if (isHangulChar(char)) {
      let end = index + 1;
      while (end < glued.length && isHangulChar(glued[end] ?? "")) {
        end += 1;
      }
      pieces.push(convertHangulRun(glued.slice(index, end)));
      index = end;
      continue;
    }
    pieces.push(char);
    index += 1;
  }

  let english = pieces.join("").replace(/\s+/g, " ").trim();
  const brandName = brand?.trim();
  if (brandName) {
    const escaped = brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    english = english.replace(new RegExp(`^(${escaped})(?:\\s+\\1)*\\s*`, "i"), "").trim();
  }

  return english.replace(/\s+/g, " ").trim();
}

export function looksLikeBarcode(value: string | null | undefined): boolean {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return false;
  }
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 14 && digits === raw.replace(/\s+/g, "");
}

export function getStorefrontBarcode(product: {
  barcode?: string | null;
  sku?: string | null;
}): string | null {
  const barcode = product.barcode?.trim() || null;
  if (barcode) {
    return barcode;
  }
  const sku = product.sku?.trim() || null;
  return sku && looksLikeBarcode(sku) ? sku : null;
}
