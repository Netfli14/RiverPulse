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

## 16 November: expanded motion design

The requested direction is stronger choreography around the real RC-01 prototype and the water-to-action process. Allowed patterns: the existing two water colours and orange accent, real prototype photographs, finite water rings, scroll-driven river paths, kinetic headings, a sticky process illustration, a four-stage progress rail and labelled explanatory SVG drawings. No new runtime dependencies or telemetry-like sample values were added.

### Checked with evidence

| Check | Result and evidence |
| --- | --- |
| Robot depth and choreography | `components/river-motion.tsx:34` maps scroll to 92px photo movement, -54px river movement and -7 degrees photo rotation. Pointer limits and springs are preserved. |
| Story state and rendering | `components/waterguard-story.tsx:118` uses motion values for progress. A ref prevents React state changes except when crossing stage boundaries. Browser scroll changed the selected phase to 2 and displayed the collection diagram. |
| Story photo and diagram exits | `components/waterguard-story.tsx:88` and `:99` use AnimatePresence; scene photos fade out in 200ms and schematic content in 160ms. Step icons also crossfade on completion. |
| Heading reveals | `components/waterguard-story.tsx:31` observes the stationary heading, then moves its child lines. An initial clipped-child observation bug was found and fixed; the mobile screenshot displayed both lines after scrolling. |
| Mobile stage controls | A real 375px iframe changed to phase 1 with only `wg-story-step-1` visible; pressing Enter on the action button changed it to phase 3. |
| Responsive width | Real application iframes at 375 / 768 / 1024 / 1440px had client widths 365 / 758 / 1014 / 1430px respectively, with matching document scroll widths. The 10px difference is the browser scrollbar. |
| Languages and themes | RU and EN layouts were inspected; a 375px KZ frame retained equal document/client width and translated stage controls. The real theme control switched between dark and light surfaces. |
| Reduced motion in source | `useReducedMotion`, `useDesktopMotion` and `app/waterguard.css:323` remove transforms, photo zoom, entrance sequences and the pinned interval. Stage buttons remain available. |
| Animation properties and focus | Static hygiene audit found no animated layout properties, no outline removal and no broad will-change. The new stage controls define normal, hover, pressed, active and focus-visible states. They are never disabled because every stage is available. |
| Contrast | Milk on dark water = 10.72:1; sand on chestnut = 10.66:1. The initial active-button text colour was darkened to chestnut for sufficient contrast against orange. |
| Build and regression boundary | TypeScript and the Next.js production build passed. All 32 existing tests passed. The diff contains homepage presentation files and design documentation only; BLE, camera, APIs, authentication, river data, PDFs and robot providers are unchanged. |

The static tells audit introduced no fabricated metrics, perpetual decorative loops, glow, glass or placeholder identities. Its RC-01 finding is the real device ID. Existing loading spinners, an inherited data separator and broad decorative-motion warnings are unchanged; informative images/text must remain in the accessibility tree, and decorative SVG ancestors already have aria-hidden. The hover-transition finding for the new stage button is a detector limitation: the base button rule declares its colour, background and border transitions.

Two observed issues were fixed: clipped heading reveals and active-button text contrast. Responsive checks, stage controls and the heading correction were checked in the browser. No application errors were observed; extension-metadata errors in the console came from a chrome-extension URL.

### Not verified

Frame time and physical hardware remain unverified. To measure frame time, record the hero and story in Chrome DevTools > Performance, including CPU throttling; target 16.7ms at 60Hz. To verify the reduced-motion runtime, enable the OS preference and repeat scrolling and stage selection. No profiler trace or OS preference emulation was collected. Production account creation was outside this visual change.

Modules loaded: motion-principles, mobile-principles, framer-motion, css-native, tells with web reference, design-audit.
Modules not loaded: none required by this implementation.
