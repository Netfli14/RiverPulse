import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";

export async function GET(request:NextRequest){
  const bearer=request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  const ok=await verifyAdminSession(bearer||request.cookies.get("riverpulse_admin")?.value);
  return NextResponse.json({ok},{status:ok?200:401,headers:{"Cache-Control":"no-store"}});
}

export async function DELETE(){
  const response=NextResponse.json({ok:true});
  response.cookies.set("riverpulse_admin","",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:0});
  return response;
}
