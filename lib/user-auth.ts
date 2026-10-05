const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");

export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export async function passwordHash(password: string, saltHex: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 210_000, hash: "SHA-256" }, key, 256));
}

export function newSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function sessionKey() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Session signing secret unavailable");
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

export async function createUserSession(userId: string) {
  const payload = `${userId}.${Date.now() + 7 * 24 * 60 * 60 * 1000}`;
  const signature = hex(await crypto.subtle.sign("HMAC", await sessionKey(), encoder.encode(payload)));
  return `${payload}.${signature}`;
}

export async function verifyUserSession(token: string | undefined) {
  if (!token || !process.env.ADMIN_SESSION_SECRET) return null;
  if(token.split(".").length!==3)return null;
  const [userId, expiry, signature] = token.split(".");
  if (!userId || !expiry || !signature || !Number.isFinite(Number(expiry)) || Number(expiry) < Date.now()) return null;
  const expected = hex(await crypto.subtle.sign("HMAC", await sessionKey(), encoder.encode(`${userId}.${expiry}`)));
  if (expected.length !== signature.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0 ? userId : null;
}
