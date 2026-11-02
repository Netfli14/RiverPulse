import { NextRequest, NextResponse } from "next/server";
import { visitorId, VISITOR_COOKIE } from "@/lib/portal-auth";
import { putRecord } from "@/lib/portal-storage";
export async function POST(request: NextRequest) {
  const visitor = visitorId(request);
  try {
    await putRecord("visitors", visitor, { createdAt: Date.now() }, true);
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(VISITOR_COOKIE, visitor, { path: "/", maxAge: 365 * 86400, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    return response;
  } catch { return NextResponse.json({ ok: false }, { status: 503 }); }
}
