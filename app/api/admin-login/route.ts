import { NextRequest, NextResponse } from "next/server";
import { createAdminSession, validAdminPassword } from "@/lib/admin-auth";

export async function POST(request:NextRequest){
  const body=await request.json().catch(()=>({})) as {password?:unknown};
  if(!process.env.ADMIN_PASSWORD||!process.env.ADMIN_SESSION_SECRET)return NextResponse.json({ok:false,error:"Admin access is not configured"},{status:503});
  if(typeof body.password!=="string"||!validAdminPassword(body.password))return NextResponse.json({ok:false},{status:401});
  const token=await createAdminSession();
  const response=NextResponse.json({ok:true,token},{headers:{"Cache-Control":"no-store"}});
  response.cookies.set("riverpulse_admin",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:8*60*60});
  return response;
}
