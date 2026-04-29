import { cookies } from "next/headers";

const COOKIE_NAME = "simpinv_store";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function normalizeStoreName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

export function isValidStoreSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,49}$/.test(slug);
}

export async function getStoreFromCookie(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(COOKIE_NAME)?.value;
  return value && isValidStoreSlug(value) ? value : null;
}

export async function setStoreCookie(slug: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, slug, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearStoreCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
