import {validateTelemetry} from "@/lib/robot-protocol";
import {latestTelemetry,saveTelemetry} from "@/lib/telemetry-storage";
const headers={"Cache-Control":"no-store"};
export async function GET(){try{const row=await latestTelemetry();return Response.json({reading:row?.payload??null,receivedAt:row?.received_at??null},{headers})}catch{return Response.json({reading:null,error:"storage_unavailable"},{status:503,headers})}}
function equal(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
export async function POST(request:Request){
  const expected=process.env.ROBOT_INGEST_TOKEN;
  if(!expected||expected.length<32)return Response.json({error:"ingest_unconfigured"},{status:503,headers});
  const token=request.headers.get("authorization")?.replace(/^Bearer /,"")??"";
  if(!equal(token,expected))return Response.json({error:"unauthorized"},{status:401,headers});
  let packet;
  try{if(!request.headers.get("content-type")?.includes("application/json"))throw new Error();
    const body=await request.text();if(new TextEncoder().encode(body).length>4096)return Response.json({error:"packet_too_large"},{status:413,headers});packet=validateTelemetry(JSON.parse(body));
    if(packet.measuredAt&&Math.abs(Date.now()-Date.parse(packet.measuredAt))>60000)throw new Error();
  }catch{return Response.json({error:"invalid_packet"},{status:400,headers})}
  try{const receivedAt=await saveTelemetry(packet);return Response.json({ok:true,seq:packet.seq,receivedAt},{status:201,headers})}catch{return Response.json({error:"storage_unavailable"},{status:503,headers})}
}
