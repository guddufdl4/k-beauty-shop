/** Keep a detail-panel approval scoped to that member, even during a bulk selection. */
export function normalizeMemberDecision(data: FormData): string | null {
  const single = data.get("single_approve");
  if (typeof single === "string" && single) {
    data.set("decision", "approve");
    data.delete("member_id");
    data.append("member_id", single);
    return single;
  }
  if (data.get("decision") === "mobile-grade") {
    data.set("decision", "grade");
    data.set("grade", String(data.get("mobile_grade") || "normal"));
  }
  return null;
}
