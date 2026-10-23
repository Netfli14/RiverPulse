// These views are already bundled into RiverPulseApp. Switching between them
// does not need another server render or a new telemetry provider.
export const APP_PATHS = [
  "/", "/map", "/water/esil", "/robots/rc-01", "/analytics", "/reports",
  "/learn", "/about", "/login", "/register", "/dashboard", "/operator",
] as const;
const paths = new Set<string>(APP_PATHS);

export function normalizeAppPath(path: string) {
  return path.replace(/\/+$/, "") || "/";
}

export function appDestination(href: string, currentUrl: string): string | null {
  try {
    const current = new URL(currentUrl);
    const next = new URL(href, current);
    const pathname = normalizeAppPath(next.pathname);
    if (next.origin !== current.origin || !paths.has(pathname) || next.hash) return null;
    return pathname + next.search;
  } catch {
    return null;
  }
}
