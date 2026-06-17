/** Toss Payments — Phase 5 placeholder (추후 연동) */

export function isTossConfigured(): boolean {
  return Boolean(
    process.env.TOSS_CLIENT_KEY && process.env.TOSS_SECRET_KEY,
  );
}

export function getTossStatusMessage(): string {
  if (isTossConfigured()) {
    return "토스페이 설정이 감지되었습니다. (연동 준비 중)";
  }
  return "토스페이는 추후 Phase 5+에서 연동 예정입니다.";
}
