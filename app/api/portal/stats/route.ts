import { countRecords } from "@/lib/portal-storage";
export async function GET() {
  const headers = { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" };
  try {
    const [visitors, user, admin, jury, accounts, reports] = await Promise.all(["visitors", "entries:user", "entries:admin", "entries:jury", "accounts", "reports"].map(countRecords));
    return Response.json({ ok: true, visitors, entries: { user, admin, jury }, accounts, reports, updatedAt: Date.now() }, { headers });
  } catch { return Response.json({ ok: false, error: "storage_unavailable" }, { status: 503, headers }); }
}
