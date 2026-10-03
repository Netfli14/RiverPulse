# RiverPulse

RiverPulse displays real ESP32 telemetry, RC-01 position on Google Maps, and camera video with YOLO detections. The interface supports Russian, Kazakh and English. Missing sensors and disconnected robots show empty or stale states; no measurements or detections are simulated.

## Connect hardware

See [the complete hardware and deployment guide](docs/HARDWARE.md).

- Flash [the ESP32 firmware](firmware/esp32/riverpulse.ino). Copy `config.example.h` to `config.h`, configure the actual hardware and implement the sensor-specific readings. Internal ESP32 temperature is not water temperature.
- Open the HTTPS website in a browser with Web Bluetooth support. On the Robots page, connect `RiverPulse-RC-01`. Received JSON notifications update the dashboard, chart and CSV export.
- For remote access, configure Wi-Fi on the ESP32, a trusted server certificate, `ROBOT_INGEST_TOKEN` and Supabase. Create the telemetry table with [the SQL migration](docs/supabase-telemetry.sql). The robot sends authenticated HTTPS packets; browsers read stored telemetry.
- Run [the YOLO gateway](gateways/yolo_gateway.py) on a laptop or Raspberry Pi with a camera and an existing model. Expose it over HTTPS, restrict CORS to your site, and enter its `/video` address and token in RiverPulse. The stream contains detections aligned with its video frames.

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

Citizen reports are explicitly labelled local drafts. They persist in the current browser and are not presented as submitted reports.

## Routes

`/`, `/map`, `/water/esil`, `/robots/rc-01`, `/analytics`, `/reports`, `/learn`, `/about`, `/dashboard`, `/operator`.
