import type { NextRequest } from "next/server";
export type PortalRole = "user" | "admin" | "jury";
export type PortalSession = { role: PortalRole; id: string; email?: string; expiresAt: number };
export const SESSION_COOKIE = "waterguard_session", VISITOR_COOKIE = "waterguard_visitor";
const encoder = new TextEncoder();
const secret = () => process.env.PORTAL_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
export function equalSecret(a: string, b: string) { let diff = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return diff === 0; }
async function key() {
  if (!secret()) throw new Error("session_unconfigured");
  return crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export async function signSession(session: PortalSession) { const payload = btoa(JSON.stringify(session)); return `${payload}.${hex(await crypto.subtle.sign("HMAC", await key(), encoder.encode(payload)))}`; }
export async function readSession(request: NextRequest): Promise<PortalSession | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !secret()) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra || payload.length > 2000) return null;
  try {
    const expected = hex(await crypto.subtle.sign("HMAC", await key(), encoder.encode(payload)));
    if (!equalSecret(signature, expected)) return null;
    const session = JSON.parse(atob(payload)) as PortalSession;
    return ["user", "admin", "jury"].includes(session.role) && typeof session.id === "string" && session.expiresAt > Date.now() ? session : null;
  } catch { return null; }
}
export async function digest(value: string) { return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value))); }
export async function hashPortalPassword(password: string, salt: string) {
  const base = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 100_000, hash: "SHA-256" }, base, 256));
}
export function visitorId(request: NextRequest) { const value = request.cookies.get(VISITOR_COOKIE)?.value; return value && /^[a-f0-9-]{36}$/.test(value) ? value : crypto.randomUUID(); }
