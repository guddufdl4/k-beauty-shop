import type { SupabaseClient } from "@supabase/supabase-js";

/** null = not probed yet, true/false = column presence cached for this process. */
let softDeleteColumnExists: boolean | null = null;

export function isMissingDeletedAtColumnError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return normalized.includes("deleted_at") && normalized.includes("does not exist");
}

export function markSoftDeleteColumnMissing(): void {
  softDeleteColumnExists = false;
}

export function markSoftDeleteColumnPresent(): void {
  softDeleteColumnExists = true;
}

export function isSoftDeleteColumnAvailable(): boolean {
  return softDeleteColumnExists !== false;
}

/**
 * Probe once per process whether products.deleted_at exists.
 * When the migration has not been applied, callers should skip deleted_at filters.
 */
export async function ensureSoftDeleteColumnProbed(
  supabase: SupabaseClient,
): Promise<boolean> {
  if (softDeleteColumnExists !== null) {
    return softDeleteColumnExists;
  }

  const { error } = await supabase.from("products").select("deleted_at").limit(1);

  if (!error) {
    softDeleteColumnExists = true;
    return true;
  }

  if (isMissingDeletedAtColumnError(error.message)) {
    softDeleteColumnExists = false;
    return false;
  }

  // Transient or unrelated error — assume column exists so we do not hide products.
  softDeleteColumnExists = true;
  return true;
}