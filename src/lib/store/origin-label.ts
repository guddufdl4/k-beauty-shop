const ORIGIN_LABELS: Record<string, string> = {
  KR: "South Korea",
  US: "United States",
  JP: "Japan",
  CN: "China",
  TW: "Taiwan",
  HK: "Hong Kong",
  SG: "Singapore",
  VN: "Vietnam",
  TH: "Thailand",
  ID: "Indonesia",
  MY: "Malaysia",
  PH: "Philippines",
  AU: "Australia",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
};

export function formatOriginLabel(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const upper = trimmed.toUpperCase();
  if (ORIGIN_LABELS[upper]) {
    return ORIGIN_LABELS[upper];
  }

  return trimmed;
}

export function catalogTitleIncludesVolume(title: string, volume: string | null | undefined): boolean {
  const size = volume?.trim();
  if (!size) {
    return false;
  }
  return title.toLowerCase().includes(size.toLowerCase());
}

export function formatCatalogDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
