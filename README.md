# RiverPulse

RiverPulse is a responsive environmental monitoring platform for rivers and lakes. It combines a real MapLibre map, demonstration water-quality telemetry, RiverCleaner robot monitoring, alerts, analytics, reports, and a role-protected operator dashboard.

> All measurements shown in the demo are simulation data and must not be used for water-safety decisions.

The map uses real OpenStreetMap/Esri tiles with sample marker locations; there are no connected field sensors. Citizen reports are saved only in the current browser for demonstration, and the photo stays on the device. The user account route is a demo view. The administrator route checks a server-side password and signed session cookie.

## Stack

- Next.js App Router, React, and TypeScript
- Tailwind CSS and shadcn/ui structure
- MapLibre GL JS with OpenStreetMap and Esri imagery
- Framer Motion and a reduced-motion-aware hero effect
- Lucide icons and responsive RU/KZ/EN interface

## Local development

Requires Node.js 22.13 or later and pnpm 11.

```bash
pnpm install
pnpm dev
```

Create `.env.local` from `.env.example` before testing the operator login:

```env
ADMIN_PASSWORD=your-password
ADMIN_SESSION_SECRET=at-least-32-random-characters
```

The operator password is never committed to the repository. In production, configure both values in the hosting provider's encrypted environment settings.

## Verification

```bash
pnpm exec tsc --noEmit
pnpm run lint
pnpm exec next build
```

## Vercel

Import the repository into Vercel, select the Next.js framework preset, and add `ADMIN_PASSWORD` plus `ADMIN_SESSION_SECRET` to Production, Preview, and Development environments. `vercel.json` explicitly runs the native Next.js production build.

## Main routes

- `/` — product overview and live demo
- `/map` — interactive monitoring map
- `/water/esil` — water-body telemetry and AI analysis
- `/robots/rc-01` — RiverCleaner monitoring
- `/analytics` — environmental analytics
- `/reports` — citizen reports
- `/learn` and `/about` — education and project information
- `/dashboard` — user dashboard
- `/operator` — protected operator dashboard
