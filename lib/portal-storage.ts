/** Durable records: a connected private Blob store, Redis, or Sites D1. */
export type PortalRecord = { createdAt: number; [key: string]: unknown };
async function d1() { try { return (await import("cloudflare:workers")).env.DB; } catch { return null; } }
const redisUrl = () => process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = () => process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
async function redis(command: (string | number)[]) {
  const response = await fetch(redisUrl()!, { method: "POST", cache: "no-store", headers: { authorization: `Bearer ${redisToken()}`, "content-type": "application/json" }, body: JSON.stringify(command) });
  if (!response.ok) throw new Error("storage_unavailable");
  const result = await response.json() as { result: unknown; error?: string };
  if (result.error) throw new Error("storage_unavailable");
  return result.result;
}
const collectionKey = (collection: string) => `waterguard:${collection}`;
const blobConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const blobPath = (collection: string, id = "") => `waterguard/${collection}/${id}${id ? ".json" : ""}`;
const blobHeaders = () => ({authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`, "x-api-version": "13"});
async function blobList(collection: string): Promise<{pathname: string}[]> {
  const rows: {pathname: string}[] = [];
  let cursor: string | undefined;
  do {
    const query = new URLSearchParams({prefix: blobPath(collection), limit: "1000"});
    if (cursor) query.set("cursor", cursor);
    const response = await fetch(`https://vercel.com/api/blob?${query}`, {cache: "no-store", headers: blobHeaders()});
    if (!response.ok) throw new Error("storage_unavailable");
    const result = await response.json() as {blobs: {pathname: string}[]; cursor?: string; hasMore: boolean};
    rows.push(...result.blobs);
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);
  return rows;
}
async function blobGet<T>(pathname: string): Promise<T | null> {
  const storeId = process.env.BLOB_READ_WRITE_TOKEN!.split("_")[3];
  if (!storeId || !/^[a-zA-Z0-9]+$/.test(storeId)) throw new Error("storage_unconfigured");
  const path = pathname.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`https://${storeId}.private.blob.vercel-storage.com/${path}?cache=0`, {cache: "no-store", headers: blobHeaders()});
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("storage_unavailable");
  return await response.json() as T;
}
export async function getRecord<T>(collection: string, id: string): Promise<T | null> {
  if (blobConfigured()) return blobGet<T>(blobPath(collection, id));
  if (redisUrl() && redisToken()) { const value = await redis(["HGET", collectionKey(collection), id]); return typeof value === "string" ? JSON.parse(value) as T : null; }
  const db = await d1(); if (!db) throw new Error("storage_unconfigured");
  const row = await db.prepare("SELECT value FROM portal_records WHERE collection = ? AND id = ?").bind(collection, id).first<{ value: string }>();
  return row ? JSON.parse(row.value) as T : null;
}
export async function putRecord(collection: string, id: string, data: PortalRecord, onlyIfNew = false): Promise<boolean> {
  if (blobConfigured()) {
    const query = new URLSearchParams({pathname: blobPath(collection, id)});
    const body = JSON.stringify(data);
    const response = await fetch(`https://vercel.com/api/blob/?${query}`, {method: "PUT", cache: "no-store", headers: {...blobHeaders(), "x-vercel-blob-access": "private", "x-content-type": "application/json", "x-add-random-suffix": "0", "x-allow-overwrite": onlyIfNew ? "0" : "1", "x-cache-control-max-age": "60", "x-content-length": String(new TextEncoder().encode(body).length)}, body});
    if (response.ok) return true;
    const error = await response.text();
    if (onlyIfNew && (response.status === 409 || /already exists/i.test(error))) return false;
    throw new Error("storage_unavailable");
  }
  if (redisUrl() && redisToken()) { const result = await redis([onlyIfNew ? "HSETNX" : "HSET", collectionKey(collection), id, JSON.stringify(data)]); return !onlyIfNew || result === 1; }
  const db = await d1(); if (!db) throw new Error("storage_unconfigured");
  const query = onlyIfNew ? "INSERT OR IGNORE INTO portal_records (collection,id,value,created_at) VALUES (?,?,?,?)" : "INSERT INTO portal_records (collection,id,value,created_at) VALUES (?,?,?,?) ON CONFLICT(collection,id) DO UPDATE SET value=excluded.value";
  const result = await db.prepare(query).bind(collection, id, JSON.stringify(data), data.createdAt).run();
  return !onlyIfNew || Boolean(result.meta.changes);
}
export async function listRecords<T extends PortalRecord>(collection: string): Promise<T[]> {
  if (blobConfigured()) {
    const items = await blobList(collection), rows: T[] = [];
    for (let i = 0; i < items.length; i += 20) {
      const batch = await Promise.all(items.slice(i, i + 20).map(item => blobGet<T>(item.pathname)));
      for (const row of batch) if (row !== null) rows.push(row as T);
    }
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  }
  if (redisUrl() && redisToken()) { const rows = await redis(["HVALS", collectionKey(collection)]) as string[]; return rows.map(row => JSON.parse(row) as T).sort((a, b) => b.createdAt - a.createdAt); }
  const db = await d1(); if (!db) throw new Error("storage_unconfigured");
  const rows = await db.prepare("SELECT value FROM portal_records WHERE collection = ? ORDER BY created_at DESC").bind(collection).all<{ value: string }>();
  return rows.results.map(row => JSON.parse(row.value) as T);
}
export async function countRecords(collection: string): Promise<number> {
  if (blobConfigured()) return (await blobList(collection)).length;
  if (redisUrl() && redisToken()) return Number(await redis(["HLEN", collectionKey(collection)]));
  const db = await d1(); if (!db) throw new Error("storage_unconfigured");
  const row = await db.prepare("SELECT COUNT(*) AS total FROM portal_records WHERE collection = ?").bind(collection).first<{total: number}>();
  return row?.total || 0;
}
