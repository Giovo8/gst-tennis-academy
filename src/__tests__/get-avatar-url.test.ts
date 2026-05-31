/**
 * @jest-environment node
 *
 * Test per il helper getAvatarUrl in /lib/utils.ts
 */

import { getAvatarUrl } from "@/lib/utils";

describe("getAvatarUrl", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("restituisce null quando avatarUrl è assente", () => {
    expect(getAvatarUrl()).toBeNull();
    expect(getAvatarUrl(null)).toBeNull();
    expect(getAvatarUrl("")).toBeNull();
  });

  it("ritorna l'URL così com'è se è già assoluto (https)", () => {
    const url = "https://cdn.example.com/avatar.png";
    expect(getAvatarUrl(url)).toBe(url);
  });

  it("ritorna l'URL così com'è se è già assoluto (http)", () => {
    const url = "http://cdn.example.com/avatar.png";
    expect(getAvatarUrl(url)).toBe(url);
  });

  it("ritorna l'URL originale quando SUPABASE_URL non è configurato", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(getAvatarUrl("avatar.png")).toBe("avatar.png");
  });

  it("antepone l'URL Supabase quando il path inizia con /storage/", () => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    expect(getAvatarUrl("/storage/v1/object/public/avatars/me.png")).toBe(
      "https://project.supabase.co/storage/v1/object/public/avatars/me.png"
    );
  });

  it("costruisce l'URL pubblico della bucket avatars per un path relativo", () => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    expect(getAvatarUrl("me.png")).toBe(
      "https://project.supabase.co/storage/v1/object/public/avatars/me.png"
    );
  });

  it("usa NEXT_PUBLIC_SUPABASE_URL come fallback quando SUPABASE_URL è assente", () => {
    delete process.env.SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://public.supabase.co";
    expect(getAvatarUrl("me.png")).toBe(
      "https://public.supabase.co/storage/v1/object/public/avatars/me.png"
    );
  });
});
