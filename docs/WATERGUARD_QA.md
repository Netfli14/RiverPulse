# Water Guard verification

- User, administrator and jury access is enforced by server-signed sessions.
- Cross-user report access, jury mutation and unsigned requests are denied by the integration flow test.
- The integration flow verifies signup, duplicate signup, login, wrong credentials, code login, jury entry, complaint submission, moderation, unique visitor counts and authenticated telemetry relay through private storage.
- The 24 existing navigation, BLE, packet validation, STOP acknowledgement and HTTP-ingestion checks remain in the suite.
- Original presentation: 13 pages. Original poster: 2 pages. Both copied with SHA-256 equality; rendered page contact sheet inspected without cropping.
- Local TypeScript and Next.js production build are required before publishing.
- Managed preview did not pass its infrastructure health check, so browser layout QA continues on the deployed Vercel site.
- Physical ESP32/camera and low-end-device frame profiling require the real hardware.

Motion modules used: motion-principles, mobile-principles, framer-motion. Existing canvas halftone reference retained with full wordmark and static reduced-motion fallback. No dependency added.
