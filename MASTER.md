# RiverPulse design system

Scope: full visual redesign explicitly requested by the user, preserving all routes, auth, BLE GATT, firmware, packet validation, STOP acknowledgements, WSS, HTTPS ingestion, Google Maps and camera/YOLO protocols from GitHub commit 180bc12.

Visual direction: an environmental field platform with a milk ground, forest headings, turquoise actions, sand sections, terracotta highlights and a chestnut footer. Use the exact supplied palette. A generous asymmetric opening leads directly to the real device workspace. No generated metrics, placeholder graphs or invented water-quality assessments.

Audience assumption: the RiverPulse team, robot operators and people viewing river measurements. The primary tasks are connecting RC-01 and observing received readings.

Allowed patterns: the user-supplied warm milk background; large sans-serif headings; line separators on actual sensor rows and measurement tables; a single abstract river contour illustration (explicitly artistic, not a chart or geographic map); real connection status indicators; a faint technical label on the river illustration; finite line drawing and replay; numeric sensor cards; route and scroll reveals. No decorative status loops, gradients, glowing blobs, fake dashboards or empty decorative tiles.

## Colour tokens

| Token | Value | Role |
| --- | --- | --- |
| teal | #31798C | Primary buttons and links |
| sand | #D2D0BB | Supporting sections and landscape |
| forest | #254A0F | Headings and icons |
| chestnut | #412010 | Footer, dark blocks, dark theme |
| milk | #F7F6EE | Main background |
| white | #FFFFFF | Panels |
| terracotta | #C9825C | Decorative accent, warnings with dark text |
| ink | #252C26 | Body text |

Public existing semantic token names stay. Their values change to these colours and colour-mix derivatives. Light is the default; the existing theme switch and saved preference remain supported.

## Type

Locally available Arial/Helvetica/Segoe UI sans-serif; no network font requirement. Cyrillic and Kazakh support take precedence. Hero 48–88px, page heading 32–62px, section heading 28–46px, body 16–18px with 1.55–1.7 line height, labels 12–14px. Numeric readings use tabular figures. Never monospace for body copy.

## Layout and components

Spacing: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px. Shell maximum 1440px; horizontal gutters 20–64px. Corners 8px for inputs, 12px for buttons, 20px for panels, 28px for river art. No floating cards or heavy shadows. Touch targets at least 44px. Responsive stacks at 1000, 760 and 480px.

Primary buttons: white on teal; hover darkens teal; focus uses a clearly visible outline; active moves 1px; disabled reduces opacity and never accepts input. Secondary buttons use outlined ink. Controls are normal semantic buttons, links, inputs and details. All form names and existing validation remain.

## Motion

Genjutsu source: https://github.com/AThevon/genjutsu (installed adapted bundle). Loaded modules: motion-principles, mobile-principles, framer-motion, tells + web reference, design-audit.

Micro interactions 150ms; UI feedback 200–280ms; section reveals 480ms; river line drawing 2.2s once with replay; no perpetual decorative loops. Standard easing cubic-bezier(.2,0,0,1). Animate transform and opacity; SVG pathLength is used only for the river drawing. Reduced motion disables translation, scroll parallax and drawing. MotionConfig applies the user preference globally. Connection provider stays outside route animations; no animation can delay notifications, packet processing or STOP.

## Content

Keep RU/KZ/EN, theme switch, account/role controls, report drafts and exports. Primary header focuses on map, monitoring and robot; reports, analytics and learning remain accessible. Until data arrives, show a short explanation and a dash; preserve last readings and flag stale data after 15 seconds. Show source and actual receive time. No displayed simulation data. The homepage live section is the real provider, not a mockup.
