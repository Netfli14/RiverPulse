# 21 November 2026: Sarykol density and entry review

The map now opens on Sarykol in a waste-density mode, with an ordinary Google map still available. The supplied reference's scientific palette stays inside the map. The existing brand, operational data and role destinations remain intact. The homepage starts rendering before saved preferences finish loading, the first action has a stronger orange accent, and the footer is sized by its contents.

## Verification evidence

| Area | Observed result |
| --- | --- |
| Regression suite | `npm test`: 37 passed, 0 failed. The existing 32 tests cover navigation, registration and login, roles, complaint persistence, visitor counting, HTTP ingestion, BLE framing and STOP flow. Hardware and persistence are exercised with test doubles. |
| Types and production build | `node node_modules/typescript/bin/tsc --noEmit` and `npm run vercel-build` passed. Every existing app/API route compiled, and temporary QA routes were absent. The generated homepage HTML contains both `id="wg-title"` and the prototype asset before client JavaScript. |
| New geographic tests | Five tests check the exact Sarykol centre, bounded deterministic points, synthetic provenance, finite normalised fields, colour endpoints and Mercator projection round trips. A longitude wrapping error found during panning was corrected and covered by the projection test. |
| Sarykol default | Local rendered map and all four responsive frames selected Sarykol and waste density. Coordinates are 42.535650, 68.288398, as supplied by the team. No river path was invented. |
| Ordinary map | Switching modes produced the existing Google iframe with `q=42.53565,68.288398&z=15`. Both river buttons remain available. |
| Density renderer | The testing browser has no WebGL2. The supported native 2D fallback displayed raster cartography, geographic heat, a team marker and controls. Sixteen visible OSM tiles loaded with natural width 256. |
| Map controls | Zoom increased from 14 to 15; centring restored zoom 14. ArrowRight moved the team marker exactly 90 pixels, preserving latitude. The density checkbox set the heat canvas opacity to zero and could restore it. |
| Filters | Live-only returned zero rivers without connected hardware. A nonmatching search returned an explicit empty state. Reset restored Sarykol and both available water bodies. |
| Responsive widths | Frames of 375 / 768 / 1024 / 1440px had matching document client/scroll widths of 365 / 758 / 1014 / 1440px. The smaller values reflect the browser scrollbar. Mode buttons were at least 46px high. |
| Languages and theme | RU, KZ and EN density controls and legend were inspected. The 375px KZ/EN frame had no horizontal overflow. The theme control applied the existing `.dark` class. |
| Footer spacing | The 1440px frame measured a 331px footer with a 144px wordmark area and an 18px gap after its rule. The previous large fixed-height gap is gone. Mobile stacks the columns and retains a 44px back-to-top control. |
| Entry behaviour | The top-level preference loading gate was removed. Public home and auth pages render immediately; the existing protected-route portal/session gates remain unchanged. Prototype arrival and scene replay remain in place. |
| Production baseline | Before this change, the live “Я из жюри” action successfully entered a jury session and opened the map. No production user/admin credentials were entered. |
| Motion hygiene | Static design audit found no animated layout properties, outline removal, broad will-change, missing reduced-motion rule, gradient text, glow or blob. Existing loading spinners remain. |
| Boundaries | Auth implementation, API handlers, telemetry provider, firmware, BLE, camera/YOLO, water-body measurements, original PDFs and QR links were not modified. Local-only visual QA routes are removed before building/publishing. |

The density scenario is always labelled as a demonstration, with a relative index rather than measured mass. Each feature retains `source: synthetic_example`. No generated point is stored as a received sensor packet, complaint or real river measurement. OSM attribution is permanent in both rendering paths. A cartography failure leaves a labelled georeferenced scenario rather than a blank page.

## Limits

- WebGL rendering compiled and typechecked, but its runtime could not be exercised in the available browser. The native 2D capability path was exercised instead.
- A physical ESP32, GPS and camera were not connected. Real radio traffic, camera frames and acknowledged emergency STOP still require the device.
- No fresh real user account or administrator session was created in production. The automated auth/registration/role suite passed, and production jury entry was exercised.
- No frame-time profiler trace or OS reduced-motion toggle was collected. The existing reduced-motion guards and new footer media-query listener were reviewed in source.
- Cartography at the supplied coordinate can be sparse. The site keeps the team's coordinate; it does not silently reposition the location to a more visually convenient waterway.
