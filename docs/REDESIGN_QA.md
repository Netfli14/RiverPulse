# RiverPulse redesign validation

Date: 23 October 2026. Baseline: Netfli14/RiverPulse commit 180bc12b004f208fa31e11e402378dfde400da81.

The current Sites source was older than GitHub. The latest GitHub files were restored before changing the visual layer. BLE, firmware, packet schema, provider, ingestion, auth, Google Maps and camera/YOLO implementations retain the latest upstream fixes.

## User story

Open RiverPulse → connect RC-01 over BLE or a secure network gateway → decode validated telemetry in the persistent root RobotProvider → update readings, GPS, freshness and the measurement log. Camera/YOLO remains a separately connected video channel.

## Verified

- 17 existing robot-flow tests pass. They cover MTU-fragmented JSON, UTF-8, malformed notifications, invalid readings, stale/future timestamps, cancelled choosers, superseded GATT connections, reconnect/reset, STOP writes, authentication and isolated HTTP ingestion/persistence.
- TypeScript `tsc --noEmit` passes.
- Next.js production build passes. Sites production build is checked as part of packaging.
- Browser: new homepage and robot, map and water pages render; navigation and the mobile menu work.
- Homepage checked in real iframe viewports at 375, 768, 1024 and 1440 CSS pixels. Scroll widths equal available client widths (360/753/1009/1425 after scrollbars), with no horizontal overflow. Robot/map/water also checked at 375 pixels.
- RU → KZ → EN → RU preserves functioning controls and translated content. Theme switch works and computed dark text tokens resolve to #F7F6EE.
- Bluetooth button on the HTTP-only QA origin correctly reports the HTTPS requirement. The physical chooser/GATT step is covered by isolated client tests, not physical hardware.
- An insecure `ws://` gateway address is rejected with a visible localized error before a connection opens.
- Real Google Maps iframe loads the Ishim point. “Only receiving data” filters out the offline robot.
- Offline sensors display dashes; no chart, invented measurement, fake camera image or generated water-quality assessment is rendered.
- The temporary responsive QA page was removed before packaging.

## Design audit

- Palette: user-supplied eight colours, implemented in `app/globals.css` and documented in `MASTER.md`.
- Computed contrast: white on turquoise 4.95:1; forest on milk 9.38:1; ink on milk 13.21:1; sand on chestnut 9.37:1; forest on sand 6.53:1.
- Audit script: no layout-property animation, hidden focus outline or missing reduced-motion guard.
- Decorative river SVG is aria-hidden; reveal wrappers and numeric readings contain real content and remain accessible.
- Five states are defined for buttons/links; connection feedback has entry/exit opacity animation.
- Existing conditional forms/camera states change immediately. They are intentionally preserved; not every existing conditional render has an exit animation.
- The old, unreferenced `components/ui/neon-flow.tsx` still contains a pre-existing clickable div audit finding. It is not imported or displayed by the redesigned app.
- RC-01 labels refer to the actual registered device, not invented part numbers. The river contour is an artistic illustration, not a geographic map or data chart.

## Not verified here

- Physical ESP32 pairing, sensor calibration and real camera/YOLO hardware. No device is available in this environment. No synthetic measurements were sent to the live database.
- Live 4G/Wi-Fi gateway, production ingest token/database configuration and video gateway reachability. Existing configuration was preserved.
- Real-device frame performance: Chrome DevTools Performance across interaction should remain within the 16.7 ms frame budget.
- OS reduced-motion runtime path: inspect with the OS setting enabled. Static guards and MotionConfig are present; parallax, drawing and translation are disabled by the guard.

Modules loaded: motion-principles, mobile-principles, framer-motion, tells, ui-ux-pro-max, design-audit. The web tells reference was read. UI-UX lookup supplied flat layout and interaction guidance; its unrelated palette/font suggestion was discarded in favour of the supplied palette and a local Cyrillic/Kazakh-capable font stack.

Modules not loaded: none required by the selected stack.

## Navigation follow-up

The reported page-opening problem was investigated on the published Vercel site. All 12 supported URLs returned HTTP 200, but client clicks initially left the old view displayed while a server navigation completed. No application exception appeared in the browser console during reproduction.

Known RiverPulse views now use same-document navigation with the native History API integrated with `usePathname`. This switches the already loaded view without an RSC round trip or document reload. Normal links remain available for direct opens, modified clicks, new tabs, downloads, external URLs and unknown routes. Browser Back/Forward is preserved. Protected views still execute their existing auth gates, and the root robot provider remains mounted.

Storage reads/writes no longer throw out of the preference effects. A blocked browser store therefore cannot leave the entire application on the initial loader. A per-page error boundary offers retry and a home link without unmounting the root device provider.

Validation: 24 tests pass (17 existing robot/auth/ingestion tests plus 7 navigation regressions); TypeScript and the Next.js production build pass. In the supervised browser, the map, water, robot, analytics, reports, learning, about, login and registration views open through their actual links. Back/Forward between login and registration works; no application console errors were observed. Authenticated sessions and physical hardware were not created or simulated for this test.
