# November 2026 design verification

The change adds depth to Water Guard's existing interface while preserving the operational code. It uses the supplied prototype photographs, a dark river scene, overlapping photographic layers, a single arrival animation, shared colour tokens and a self-hosted font.

## Checked here

| Check | Evidence |
| --- | --- |
| Types | `node node_modules/typescript/bin/tsc --noEmit` passed. |
| Vercel build | `npm run vercel-build` passed; all existing app and API routes compiled. |
| Existing regression tests | `npm test`: 32 passed, 0 failed. Includes navigation, role/auth boundaries, packet validation, ingestion and river provenance. |
| Responsive homepage | Rendered the real application inside 375, 768, 1024 and 1440px viewport frames. Document scroll width equalled client width at every size; no page-level horizontal overflow. |
| Languages | RU, KZ and EN inspected in the browser. Kazakh and English were also checked in the 375px viewport. |
| Mobile navigation | Expanded and collapsed the actual menu. Its display was block and its height 69px while open; fixed the guest-only desktop rule that otherwise hid it. |
| Dark theme | Actual theme control toggled the iframe document to `.dark`; styles use the existing theme variables. |
| Font coverage | Self-hosted Inter loaded in the browser. Font cmap contains every letter in ӘәІіҢңҒғҮүҰұҚқӨөҺһ. |
| Contrast | Body #18363D on #F4F5EF: 11.72:1. Heading #123D48: 10.72:1. Teal on milk: 4.51:1. White on action #B84727: 5.29:1. Sand on dark water: 8.86:1. |
| Reduced-motion implementation | `PrototypeScene` checks `useReducedMotion`; the CSS reduced-motion rule removes arrival animation and object transforms. |
| Photo and document provenance | Photographs are extracted from the supplied English presentation with original alpha masks. No changes to source-documents, public/documents, PDFs or QR codes. |
| Hardware boundaries | No changes to robot provider, camera implementation, BLE client, protocol, firmware, API handlers, stored river data or auth/storage implementation. |

Static motion checks were run with Genjutsu's audit script. The Impeccable detector found two warnings: Inter is a common font, retained for the user's established font preferences and verified Kazakh coverage; an inherited thick notice border, removed in this refinement. Hover transitions live on the affected component or its shared link/button styles. RC-01 is the existing real device ID rather than an invented decorative code. The animated robot image has informative alternative text, while its decorative SVG background is hidden from accessibility APIs.

Modules loaded for implementation: motion-principles, mobile-principles, framer-motion, tells (including web reference), design-audit. Modules not loaded: none required by the selected implementation.

## Not verified here

| Check | How to verify |
| --- | --- |
| Hardware end-to-end | Connect the physical ESP32/robot/camera, receive a real packet and camera frame, and test the acknowledged STOP flow. No device was available in this session. |
| Frame-time budget | Chrome DevTools → Performance: record movement over the robot, section navigation and the footer; inspect frames against the 16.7ms target. No profiler trace was collected. |
| OS reduced-motion runtime | Enable the operating system's Reduce Motion setting and repeat entry and pointer movement. The source guard was checked; the OS setting was not controlled. |

The fresh local preview lacks production session/storage configuration, so authenticated routes were not validated there. Existing auth tests passed; production account registration was not exercised using a new real account.
