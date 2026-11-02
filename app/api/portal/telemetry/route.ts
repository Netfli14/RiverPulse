import {NextRequest} from "next/server";
import {readSession} from "@/lib/portal-auth";
import {validateTelemetry} from "@/lib/robot-protocol";
import {saveTelemetry} from "@/lib/telemetry-storage";
const headers={"Cache-Control":"no-store"};
export async function POST(request:NextRequest){
  if((await readSession(request))?.role!=="admin")return Response.json({error:"forbidden"},{status:403,headers});
  let packet;
  try{
    if(!request.headers.get("content-type")?.includes("application/json"))throw new Error();
    const text=await request.text();
    if(new TextEncoder().encode(text).length>4096)return Response.json({error:"packet_too_large"},{status:413,headers});
    packet=validateTelemetry(JSON.parse(text));
    if(packet.measuredAt&&Math.abs(Date.now()-Date.parse(packet.measuredAt))>60000)throw new Error();
  }catch{return Response.json({error:"invalid_packet"},{status:400,headers})}
  try{return Response.json({ok:true,receivedAt:await saveTelemetry(packet)},{status:201,headers})}
  catch{return Response.json({error:"storage_unavailable"},{status:503,headers})}
}
