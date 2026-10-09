import "server-only";
import { scryptSync, timingSafeEqual } from "node:crypto";
const expected = Buffer.from("89cf2b5b80a9c0fe952f946343f3a214f0fadcb0af77999fdd12b9625a8f6364", "hex");
export function verifyAdminDesignationPassword(value: string): boolean {
 if (!value || value.length > 128) return false;
 return timingSafeEqual(scryptSync(value, "hmt-admin-designation-v1", 32), expected);
}
