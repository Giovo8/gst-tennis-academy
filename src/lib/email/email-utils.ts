import logger from "@/lib/logger/secure-logger";

export type EmailRecipientRole = "gestore" | "maestro" | "atleta";

export type EmailRecipient = {
  id?: string | null;
  email: string;
  full_name?: string | null;
  role: EmailRecipientRole;
};

export function normalizeEmail(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return null;
  }

  return normalized;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function getGestoreRecipients(): Promise<EmailRecipient[]> {
  const { supabaseServer } = await import("@/lib/supabase/serverClient");
  const { data, error } = await supabaseServer
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("role", "gestore")
    .not("email", "is", null);

  if (error) {
    logger.error("Failed to fetch gestore recipients", error);
    return [];
  }

  const byEmail = new Map<string, EmailRecipient>();

  for (const item of data || []) {
    const normalizedEmail = normalizeEmail(item.email);
    if (!normalizedEmail) continue;
    if (byEmail.has(normalizedEmail)) continue;

    byEmail.set(normalizedEmail, {
      id: item.id,
      email: normalizedEmail,
      full_name: item.full_name || null,
      role: "gestore",
    });
  }

  return Array.from(byEmail.values());
}
