import { NextRequest, NextResponse } from "next/server";
import { digest, equalSecret, hashPortalPassword, readSession, SESSION_COOKIE, signSession, visitorId, VISITOR_COOKIE, type PortalRole } from "@/lib/portal-auth";
import { countRecords, getRecord, putRecord, type PortalRecord } from "@/lib/portal-storage";
import { normalizeEmail } from "@/lib/user-auth";
const headers = { "Cache-Control": "no-store" };
type Account = PortalRecord & { id: string; email: string; salt: string; hash: string };
export async function GET(request: NextRequest) { const session = await readSession(request); return NextResponse.json({ session: session ? { role: session.role, email: session.email } : null }, { headers }); }
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin"), host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (origin && new URL(origin).host !== host) return NextResponse.json({ error: "forbidden" }, { status: 403, headers });
  const body = await request.json().catch(() => null) as { role?: PortalRole; action?: string; email?: unknown; password?: unknown; code?: unknown } | null;
  if (!body || !["user", "admin", "jury"].includes(body.role || "")) return NextResponse.json({ error: "invalid_input" }, { status: 400, headers });
  const role = body.role!, visitor = visitorId(request);
  try {
    const ip = request.headers.get("x-vercel-forwarded-for") || request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || visitor;
    const bucket = await digest(`${ip}:${Math.floor(Date.now() / 300000)}`), attempts = `auth-limit:${bucket}`;
    if (await countRecords(attempts) >= 30) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers });
    await putRecord(attempts, crypto.randomUUID(), { createdAt: Date.now() }, true);
    let id = visitor, email: string | undefined;
    if (role === "admin") {
      if (typeof body.code !== "string" || !equalSecret(body.code, process.env.WATERGUARD_ADMIN_CODE || "123")) return NextResponse.json({ error: "invalid_code" }, { status: 401, headers });
    } else if (role === "user") {
      email = typeof body.email === "string" ? normalizeEmail(body.email) || undefined : undefined;
      if (!email || typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128 || !["login", "register"].includes(body.action || "")) return NextResponse.json({ error: "invalid_input" }, { status: 400, headers });
      const accountId = await digest(email);
      let account = await getRecord<Account>("accounts", accountId);
      if (body.action === "register") {
        if (account) return NextResponse.json({ error: "exists" }, { status: 409, headers });
        const salt = crypto.randomUUID();
        account = { id: crypto.randomUUID(), email, salt, hash: await hashPortalPassword(body.password, salt), createdAt: Date.now() };
        if (!await putRecord("accounts", accountId, account, true)) return NextResponse.json({ error: "exists" }, { status: 409, headers });
      } else {
        const hash = await hashPortalPassword(body.password, account?.salt || "missing-account-timing-salt");
        if (!account || !equalSecret(hash, account.hash)) return NextResponse.json({ error: "invalid_credentials" }, { status: 401, headers });
      }
      id = account!.id;
    }
    const token = await signSession({ role, id, email, expiresAt: Date.now() + 8 * 3600000 });
    await putRecord(`entries:${role}`, visitor, { createdAt: Date.now(), role }, true);
    await putRecord("visitors", visitor, { createdAt: Date.now() }, true);
    const response = NextResponse.json({ ok: true, role, redirect: role === "user" ? "/dashboard" : role === "admin" ? "/operator" : "/map" }, { headers });
    const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
    response.cookies.set(SESSION_COOKIE, token, { ...options, maxAge: 8 * 3600 });
    response.cookies.set(VISITOR_COOKIE, visitor, { ...options, maxAge: 365 * 86400 });
    return response;
  } catch { return NextResponse.json({ error: "unavailable" }, { status: 503, headers }); }
}
export async function DELETE() { const response = NextResponse.json({ ok: true }, { headers }); response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" }); return response; }
