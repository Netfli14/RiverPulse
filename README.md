# Water Guard Station

Water Guard Station displays real ESP32 telemetry, RC-01 position on Google Maps, and camera video with YOLO detections. The interface supports Russian, Kazakh and English. Missing sensors and disconnected robots show empty or stale states; no measurements or detections are simulated.

## Connect hardware

See [the complete hardware and deployment guide](docs/HARDWARE.md).

- Flash [the ESP32 firmware](firmware/esp32/riverpulse.ino). Copy `config.example.h` to `config.h`, configure the actual hardware and implement the sensor-specific readings. Internal ESP32 temperature is not water temperature.
- Open the HTTPS website in a browser with Web Bluetooth support. On the Robots page, connect `RiverPulse-RC-01`. Received JSON notifications update the dashboard, chart and CSV export.
- For remote access, configure Wi-Fi on the ESP32, a trusted server certificate, `ROBOT_INGEST_TOKEN` and Supabase. Create the telemetry table with [the SQL migration](docs/supabase-telemetry.sql). The robot sends authenticated HTTPS packets; browsers read stored telemetry.
- Run [the YOLO gateway](gateways/yolo_gateway.py) on a laptop or Raspberry Pi with a camera and an existing model. Expose it over HTTPS, restrict CORS to your site, and enter its `/video` address and token in Water Guard Station. The stream contains detections aligned with its video frames.

RC-01 has an assigned point on the Ishim river in Astana. Received GPS coordinates update the map. Before GPS is available, the interface identifies the point as an assigned location. Google Maps works through an embed without a browser API key; an optional restricted `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` enables the interactive Maps JavaScript view.

BLE works near the robot. For continuous remote operation, use Wi-Fi/4G with MQTT over TLS, a persistent gateway, and WebRTC for video. Keep a physical stop switch and an onboard watchdog. A BLE STOP command is only reported as confirmed after an acknowledgement from the configured motor-disable output.

## Develop and verify

Requires Node.js 22.13+ and pnpm 11.

```sh
pnpm install
pnpm dev
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm vercel-build
```

The automated tests use a mocked Bluetooth adapter to test packet fragmentation, validation, notifications, STOP writes and disconnect cleanup. They do not certify physical hardware, sensor calibration or camera inference.

## Deploy to Vercel

Import this repository with the Next.js preset. `vercel.json` selects `pnpm vercel-build`. Set optional Google Maps configuration and the server values documented in `.env.example` in Vercel's environment settings. Never commit `.env.local`, `firmware/esp32/config.h` or gateway tokens.

`ADMIN_PASSWORD` and a random `ADMIN_SESSION_SECRET` protect the operator dashboard. Real user registration on Vercel requires `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Telemetry storage additionally requires `SUPABASE_SERVICE_ROLE_KEY` and `ROBOT_INGEST_TOKEN`. On Sites, the same routes can use D1. An unconfigured database never grants a simulated user session.

## Access and community reports

The landing page introduces Water Guard Station and opens role-based access:

- Users register with an email and a password (8–128 characters), view water data and submit pollution reports. Only their own reports are returned.
- Administrators enter the requested exhibition code `123` and manage incoming reports alongside 30 clearly labelled demonstration complaints. Override the code with `WATERGUARD_ADMIN_CODE` when needed.
- Jury guests enter immediately without an account and can browse the original presentation and poster. Jury access never grants report mutation or telemetry relay access.

Accounts, report statuses and unique visitor/role counts are stored server-side. Vercel uses the connected private Blob store via `BLOB_READ_WRITE_TOKEN`; Sites uses the `portal_records` D1 table. `PORTAL_SESSION_SECRET` falls back to the existing `ADMIN_SESSION_SECRET`. Passwords use salted PBKDF2; session cookies are signed, HttpOnly, Secure in production and expire after eight hours.

An administrator's real BLE/WSS readings are relayed at most once per five seconds without blocking the hardware connection. Other browsers poll the same persisted readings; disconnected or stale states remain explicit. The device HTTPS ingestion route and existing BLE UUIDs, advertised device name and STOP acknowledgements are preserved.

The separate `counter/` site reads aggregate counts from `/api/portal/stats` with CORS enabled. Each role counts a browser once; accounts and real reports have separate totals. The 30 demonstration reports never increase the real report count.

The presentation contains the supplied replacement site and GitHub QR codes on slide 12. The poster contains its first page only. Full-page WebP previews, thumbnails and 100–300% zoom match these PDFs.

The 32.7 MB presentation is stored in four binary parts in `source-documents/` for connector uploads. Every development and build command restores `/documents/Water-Guard-Station.pdf` and checks its expected SHA-256. Downloaded PDF bytes match the checked source parts.

## Routes

`/presentation`, `/poster`, `/`, `/map`, `/water/esil`, `/robots/rc-01`, `/analytics`, `/reports`, `/learn`, `/about`, `/dashboard`, `/operator`.

## Registration recovery

Live platform: https://water-guard-station.vercel.app/. The earlier river-pulse-five.vercel.app alias is no longer attached.

Configure a separate server-only `PORTAL_SESSION_SECRET` for Production and Preview before deployment. Registration validates the signing configuration and signs a session before saving a new account. A failed signing step therefore leaves the email available for retry. Visitor-count failures are logged without failing an otherwise successful sign-in. Session encoding supports UTF-8 email addresses. Existing accounts created by an earlier failed registration can use the sign-in form with the original password.

`tests/registration-flow.test.mjs` covers configuration failure and retry, signing failure before account creation, international email sessions, and unavailable counters.
