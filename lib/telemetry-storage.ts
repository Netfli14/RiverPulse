import type {Telemetry} from "./robot-protocol";
export type StoredPacket={payload:Telemetry;received_at:number};
async function d1(){try{return (await import("cloudflare:workers")).env.DB}catch{return null}}
const table="robot_telemetry";
const configured=()=>Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY);
async function supabase(path:string,options:RequestInit={}) {
  const response=await fetch(process.env.SUPABASE_URL!.replace(/\/$/,"")+"/rest/v1/"+path,{...options,cache:"no-store",headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY!,authorization:"Bearer "+process.env.SUPABASE_SERVICE_ROLE_KEY!,"content-type":"application/json",...options.headers}});
  if(!response.ok)throw new Error("storage_unavailable");return response;
}
export async function latestTelemetry():Promise<StoredPacket|null>{
  if(configured()){const result=await supabase(table+"?robot_id=eq.rc-01&order=received_at.desc&limit=1&select=payload,received_at");return ((await result.json()) as StoredPacket[])[0]??null}
  const db=await d1();if(!db)throw new Error("storage_unconfigured");
  const row=await db.prepare("SELECT payload, received_at FROM robot_telemetry WHERE robot_id = ? ORDER BY received_at DESC LIMIT 1").bind("rc-01").first<{payload:string;received_at:number}>();
  return row?{payload:JSON.parse(row.payload),received_at:row.received_at}:null;
}
export async function saveTelemetry(packet:Telemetry){
  const receivedAt=Date.now();
  if(configured()){await supabase(table,{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({robot_id:packet.robotId,payload:packet,received_at:receivedAt})});return receivedAt}
  const db=await d1();if(!db)throw new Error("storage_unconfigured");
  await db.prepare("INSERT INTO robot_telemetry (robot_id,payload,received_at) VALUES (?,?,?)").bind(packet.robotId,JSON.stringify(packet),receivedAt).run();return receivedAt;
}
