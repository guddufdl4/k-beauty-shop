export const SHEET_REVIEW_STATES = ["pending", "verified", "option-difference", "supplier-check", "not-carried"] as const;
export type SheetReviewState = typeof SHEET_REVIEW_STATES[number];
export type SheetReviewDecision = {state: SheetReviewState; note: string; at: string; by: string};
export function parseSheetReviewDecision(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  if (!SHEET_REVIEW_STATES.includes(value.state as SheetReviewState)) return null;
  if (typeof value.note !== "string" || value.note.trim().length > 1000) return null;
  if (value.state !== "pending" && value.note.trim().length < 5) return null;
  return {state: value.state as SheetReviewState, note: value.note.trim()};
}
export function readSheetReviewDecision(source: unknown): SheetReviewDecision | null {
  if (!source || typeof source !== "object") return null;
  const value = (source as Record<string, unknown>).__sheet_review;
  const parsed = parseSheetReviewDecision(value);
  if (!parsed || !value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  return typeof data.at === "string" && typeof data.by === "string" ? {...parsed, at: data.at, by: data.by} : null;
}
