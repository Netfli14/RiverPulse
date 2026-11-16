# Water Guard Station design system

RiverPulse / Water Guard is an environmental monitoring platform for the team, robot operators, residents and jury guests. Its primary tasks are viewing received measurements, locating the robot, reporting pollution and operating RC-01. The homepage explains the project; the operational screens prioritise clear controls and readings.

The November 2026 refinement follows the user's request for more depth, the newly supplied design rules, two harmonious colours and one contrasting accent. Preserve the existing brand, factual content, role destinations and hardware behaviour.

## Colour tokens

| Token | Value | Role |
| --- | --- | --- |
| teal | #31798C | Water tone, links and operational actions |
| forest | #123D48 | Related dark water tone, headings and system section |
| chestnut | #102F38 | Deep water tone for the footer |
| sand | #D8E2DC | Neutral supporting surfaces and light text on dark water |
| milk | #F4F5EF | Light page ground |
| white | #FFFFFF | Panels and action text |
| terracotta | #F0764F | Contrasting orange accents |
| action | #B84727 | Darker orange for accessible white-text homepage action |
| ink | #18363D | Body text |

Public semantic token names remain compatible. Light is the default, with the existing saved dark-theme preference and switch supported. Neutral variants use colour-mix. Operational controls retain their existing meaning.

## Typography and layout

Inter is self-hosted at /fonts/inter-variable.woff under the included SIL Open Font License. Its subset contains Latin, Cyrillic and all Kazakh letters. No third-party font service is required. Body text uses a sans-serif stack and data uses tabular numerals. Display size is at most 88px on changed surfaces; tracking stops at -.04em.

The shell remains at most 1440px with responsive 20–64px gutters. Homepage sections have generous separation; related copy and actions stay together. Panel corners are 16px, existing buttons 12px, and the hero's large curved corner belongs to the river scene rather than ordinary cards. Controls retain their semantic links, buttons, tabs, form labels and visible focus states. Touch targets are at least 44px except inherited document-viewer controls. The guest desktop header uses one row; mobile retains expandable navigation.

Depth comes from actual photographic objects overlapping their background and soft shadows with a downward offset. Data panels use a single border rather than shadow and border together. Screens stack below 760px; 1100px and 400px refine density and scale.

## Assets and allowed patterns

Allowed patterns: actual RC-01 and station photographs extracted with their original alpha masks from the supplied English presentation; the supplied Ishim photograph; geometric river linework; a water plane beneath the robot; scroll-synchronised river lines and kinetic process typography; a sticky four-stage story with prototype photo transitions and explicitly labelled schematic drawings; offset soft shadows on physical photo objects; overlapping photos; a dark system section; the existing interactive halftone footer; separators between role choices and actual data rows.

Asset provenance:

- `rivercleaner-prototype.webp`: embedded robot photograph from presentation page 3.
- `station-prototype.webp`: embedded station photograph from presentation page 1.
- `ishim-field-test.jpg`: embedded Ishim photograph from presentation page 7; caption identifies the river and city without inventing a test date.

Do not add generated hardware, unlabelled synthetic readings, decorative status lights, glass panels, background grids, invented claims or perpetual decorative motion. Keep the real logo and favicon. The presentation and poster remain byte-for-byte unchanged.

## Motion

Use existing Framer Motion and native CSS; no new runtime dependencies.

- The robot has one 900ms arrival using cubic-bezier(.16,1,.3,1), followed by finite water-ring arrivals. Summary and actions enter in a 140–360ms sequence. The scene replay remains available.
- Pointer rotation is limited to 2.5 degrees per axis, using motion values and springs with stiffness 180 and damping 28. Movement does not update React state. Mouse leave and pointer cancellation reset the pose; touch does not drive it.
- Reduced motion removes arrival, pointer rotation, photo zoom and kinetic text. It also removes the sticky scroll story: all four stages remain available through ordinary buttons. Copy and actions remain visible.
- Desktop scroll moves the robot by at most 92px, counter-moves the river linework by 54px and rotates the photo by at most 7 degrees. These values update outside React; story state changes only at four section boundaries. On touch and narrow viewports the story uses manual stage buttons, with no pinned scroll interval.
- Story photo changes use 650ms entry / 200ms exit; diagram changes use a 160ms crossfade and finite 1100ms SVG line drawing. The drawings are labelled as explanations, never live measurements. Headings reveal by line in 700ms; role rows lift once in 650ms. All new animation uses existing Framer Motion / CSS.
- Inherited operational micro interactions use 150ms; UI feedback uses 200–280ms. Existing section reveals, river-line replay and halftone-footer behaviour remain supported outside the revised homepage.
- Animate transform and opacity for new motion; short SVG stroke drawing is restricted to the small explanatory graphics. No perpetual homepage motion, layout-property animation, or persistent will-change.

The robot provider remains outside route animations. Animation must never delay packets, notifications or STOP commands.

## Functional constraints

Preserve all existing routes, language switching (RU/KZ/EN), theme switching, user/admin/jury roles, account/session logic, report drafts and exports, visitor counter, both rivers and their labelled example weeks. Real telemetry must remain distinct from synthetic examples; missing readings stay empty and stale readings stay flagged.

Do not change ESP32 BLE GATT, firmware, packet validation, STOP acknowledgements, WSS, authenticated HTTP ingestion, Google Maps, camera/YOLO, stored data, original PDFs or QR destinations for a visual task.

See `docs/DESIGN_REVIEW.md` for checks and limits.
