export const MAX_SUPPORT_FILE_BYTES = 3 * 1024 * 1024;
export function supportFileType(bytes: Uint8Array): string | null {
  if (bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70 && bytes[4] === 45) return 'application/pdf';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if ([137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n)) return 'image/png';
  return null;
}
export function supportOwnedBy(inquiry: { user_id: string | null }, userId: string | undefined): boolean {
  return Boolean(userId && inquiry.user_id === userId);
}
export type SupportThread = {
 id: string; subject: string; message: string; created_at: string; resolved_at: string | null;
 attachment_name: string | null;
 replies: { id: string; body: string; created_at: string; from_staff: boolean }[];
};
