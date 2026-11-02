import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/portal-auth";
import { getRecord, listRecords, putRecord } from "@/lib/portal-storage";
import { demoReports, type WaterReport } from "@/lib/demo-reports";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: NextRequest) {
  const session = await readSession(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  try {
    const reports = await listRecords<WaterReport>("reports");
    if (session.role === "user") return NextResponse.json({ reports: reports.filter(row => row.userId === session.id).map(({userId: _userId, ...report}) => report) }, { headers });
    const overrides = await listRecords<{ createdAt: number; id: string; status: WaterReport["status"] }>("demo-status");
    const all = [...(session.role === "admin" ? reports : []), ...demoReports.map(row => ({ ...row, status: overrides.find(item => item.id === row.id)?.status || row.status }))];
    return NextResponse.json({ reports: all.map(({userId: _userId, ...report}) => report) }, { headers });
  } catch { return NextResponse.json({ error: "unavailable" }, { status: 503, headers }); }
}
export async function POST(request: NextRequest) {
  const session = await readSession(request);
  if (!session || session.role !== "user") return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !["floating_litter", "discharge", "water_color", "smell", "other"].includes(String(body.category)) || typeof body.description !== "string" || body.description.trim().length < 15 || body.description.length > 4000 || typeof body.location !== "string" || !body.location.trim() || body.location.length > 200 || typeof body.observedAt !== "string" || !Number.isFinite(Date.parse(body.observedAt))) return NextResponse.json({ error: "invalid_input" }, { status: 400, headers });
  const report: WaterReport = { id: crypto.randomUUID(), createdAt: Date.now(), category: String(body.category), description: body.description.trim(), location: body.location.trim(), observedAt: new Date(body.observedAt).toISOString(), status: "received", userId: session.id, demo: false };
  try { await putRecord("reports", report.id, report, true); return NextResponse.json({ ok: true, id: report.id }, { headers, status: 201 }); } catch { return NextResponse.json({ error: "unavailable" }, { status: 503, headers }); }
}
export async function PATCH(request: NextRequest) {
  if ((await readSession(request))?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403, headers });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.id !== "string" || !["received", "reviewing", "resolved"].includes(String(body.status))) return NextResponse.json({ error: "invalid_input" }, { status: 400, headers });
  try {
    if (demoReports.some(row => row.id === body.id)) await putRecord("demo-status", body.id, { createdAt: Date.now(), id: body.id, status: body.status as WaterReport["status"] });
    else { const report = await getRecord<WaterReport>("reports", body.id); if (!report) return NextResponse.json({ error: "not_found" }, { status: 404, headers }); await putRecord("reports", body.id, { ...report, status: body.status as WaterReport["status"] }); }
    return NextResponse.json({ ok: true }, { headers });
  } catch { return NextResponse.json({ error: "unavailable" }, { status: 503, headers }); }
}
