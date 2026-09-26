import { NextRequest, NextResponse } from "next/server";
import { createUserSession, newSalt, normalizeEmail, passwordHash, verifyUserSession } from "@/lib/user-auth";

type Credential = { user_id: string; password_salt: string; password_hash: string };
const noStore = { "Cache-Control": "no-store" };

// Vercel does not provide the Cloudflare D1 binding used by the full demo.
// Keep the public demo flow usable there with a signed, non-persistent session.
// When D1 is available (the Sites/Cloudflare deployment), the real database
// path below is used instead.
function encodeDemoEmail(email: string) {
  return Array.from(new TextEncoder().encode(email), byte => byte.toString(16).padStart(2, "0")).join("");
}

function decodeDemoEmail(value: string) {
  if (!value || value.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(value)) return null;
  try {
    const bytes = new Uint8Array(value.match(/.{2}/g)!.map(byte => Number.parseInt(byte, 16)));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function demoUserId(email: string) {
  return `demo:${encodeDemoEmail(email)}`;
}

async function database() {
  try { return (await import("cloudflare:workers")).env.DB; }
  catch { return null; }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { action?: string; email?: unknown; password?: unknown };
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : null;
  const password = body.password;
  if (!email || typeof password !== "string" || password.length < 8 || password.length > 128) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400, headers: noStore });
  }
  const db = await database();
  if (!process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503, headers: noStore });
  }

  if (!db) {
    if (body.action !== "register" && body.action !== "login") {
      return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400, headers: noStore });
    }
    return NextResponse.json(
      { ok: true, token: await createUserSession(demoUserId(email)), email },
      { headers: noStore },
    );
  }

  try {
    if (body.action === "register") {
      const existing = await db.prepare("SELECT email FROM user_credentials WHERE email = ?").bind(email).first();
      if (existing) return NextResponse.json({ ok: false, error: "exists" }, { status: 409, headers: noStore });
      const salt = newSalt();
      const hash = await passwordHash(password, salt);
      const id = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);
      await db.batch([
        db.prepare("INSERT INTO users (id, email, role, language, theme, created_at, updated_at) VALUES (?, ?, 'user', 'ru', 'dark', ?, ?)").bind(id, email, now, now),
        db.prepare("INSERT INTO user_credentials (email, user_id, password_salt, password_hash) VALUES (?, ?, ?, ?)").bind(email, id, salt, hash),
      ]);
      return NextResponse.json({ ok: true, token: await createUserSession(id), email }, { headers: noStore });
    }
    if (body.action !== "login") return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400, headers: noStore });
    const credential = await db.prepare("SELECT user_id, password_salt, password_hash FROM user_credentials WHERE email = ?").bind(email).first<Credential>();
    const salt = credential?.password_salt ?? "00000000000000000000000000000000";
    const hash = await passwordHash(password, salt);
    if (!credential || hash !== credential.password_hash) return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401, headers: noStore });
    return NextResponse.json({ ok: true, token: await createUserSession(credential.user_id), email }, { headers: noStore });
  } catch (error) {
    console.error("User authentication unavailable", error);
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503, headers: noStore });
  }
}

export async function GET(request: NextRequest) {
  const userId = await verifyUserSession(request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1]);
  if (!userId) return NextResponse.json({ ok: false }, { status: 401, headers: noStore });
  const db = await database();
  if (!db) {
    const email = userId.startsWith("demo:") ? decodeDemoEmail(userId.slice(5)) : null;
    return email
      ? NextResponse.json({ ok: true, email }, { headers: noStore })
      : NextResponse.json({ ok: false }, { status: 503, headers: noStore });
  }
  try {
    const user = await db.prepare("SELECT email FROM users WHERE id = ?").bind(userId).first<{ email: string }>();
    return user ? NextResponse.json({ ok: true, email: user.email }, { headers: noStore }) : NextResponse.json({ ok: false }, { status: 401, headers: noStore });
  } catch (error) {
    console.error("User session unavailable", error);
    return NextResponse.json({ ok: false }, { status: 503, headers: noStore });
  }
}
