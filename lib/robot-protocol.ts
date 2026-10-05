import { z } from "zod";

export const ROBOT_ID = "rc-01";
export const BLE_SERVICE = "7cba0001-6f4b-4a6b-8c22-f75a8af4b321";
export const BLE_TELEMETRY = "7cba0002-6f4b-4a6b-8c22-f75a8af4b321";
export const BLE_COMMAND = "7cba0003-6f4b-4a6b-8c22-f75a8af4b321";
export const STALE_AFTER_MS = 15_000;
const number = (min: number, max: number) => z.number().finite().min(min).max(max).nullable().optional();
export const telemetrySchema = z.object({
  robotId: z.literal(ROBOT_ID), bootId:z.string().min(1).max(64).optional(), seq: z.number().int().nonnegative(),
  measuredAt: z.string().datetime().optional(),
  battery: number(0,100), speed: number(0,100), container: number(0,100),
  temperature: number(-40,125), waterTemperature: number(-5,80),
  ph: number(0,14), turbidity: number(0,10000), oxygen: number(0,50),
  conductivity: number(0,200000), collectedKg: number(0,100000),
  gps: z.object({lat:z.number().finite().min(-90).max(90),lng:z.number().finite().min(-180).max(180)}).nullable().optional(),
  status: z.enum(["idle","working","charging","stopped"]).optional(),
  ack: z.object({id:z.string().max(80),command:z.literal("stop"),ok:z.boolean()}).optional(),
}).strict();
export type Telemetry = z.infer<typeof telemetrySchema>;
export type Reading = Telemetry & { receivedAt: number; source: "bluetooth" | "network" | "cloud" };
export function validateTelemetry(value: unknown): Telemetry {
  const result = telemetrySchema.safeParse(value);
  if (!result.success) throw new Error("invalid_packet");
  return result.data;
}
export function isFresh(reading: Reading | null, now = Date.now()) {
  return Boolean(reading && now - reading.receivedAt >= 0 && now - reading.receivedAt < STALE_AFTER_MS);
}
// Newline-delimited JSON, including multi-byte characters split by the BLE MTU.
export class TelemetryDecoder {
  private decoder = new TextDecoder();
  private pending = "";
  push(chunk: DataView | Uint8Array, onInvalid?: (error:unknown)=>void): Telemetry[] {
    const bytes = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    this.pending += this.decoder.decode(bytes, {stream:true});
    if (this.pending.length > 16_384) { this.reset(); throw new Error("packet_too_large"); }
    const lines = this.pending.split("\n"); this.pending = lines.pop() ?? "";
    const packets:Telemetry[]=[];
    for(const line of lines.filter(line=>line.trim())){
      try{packets.push(validateTelemetry(JSON.parse(line)))}
      catch(error){if(!onInvalid)throw error;onInvalid(error)}
    }
    return packets;
  }
  reset() { this.pending = ""; this.decoder = new TextDecoder(); }
}
export function secureEndpoint(value: string, protocols = ["https:","wss:"]) {
  const url = new URL(value);
  if (!protocols.includes(url.protocol) || url.username || url.password) throw new Error("https_required");
  return url.toString();
}

export const detectionSchema = z.object({
  robotId: z.literal(ROBOT_ID), frameId:z.number().int().nonnegative(),
  capturedAt:z.string().datetime(),
  boxes:z.array(z.object({label:z.string().min(1).max(80),confidence:z.number().min(0).max(1),
    // Coordinates are normalized to the original frame, in x/y/width/height order.
    x:z.number().min(0).max(1),y:z.number().min(0).max(1),width:z.number().min(0).max(1),height:z.number().min(0).max(1)
  }).refine(box=>box.x+box.width<=1.001&&box.y+box.height<=1.001)).max(100),
}).strict();
export type DetectionFrame = z.infer<typeof detectionSchema>;
