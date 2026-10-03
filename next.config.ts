import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // Vercel has no Cloudflare binding. Fail closed; never fabricate login sessions.
  turbopack: {resolveAlias: process.env.RIVERPULSE_RUNTIME === "sites" ? {} : {"cloudflare:workers":"./lib/cloudflare-vercel.ts"}},
  async headers(){return [{source:"/:path*",headers:[{key:"Permissions-Policy",value:"bluetooth=(self), camera=(self), microphone=()"}]}]},
};
export default nextConfig;
