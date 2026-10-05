import { NextRequest, NextResponse } from "next/server";
import { createUserSession, newSalt, normalizeEmail, passwordHash, verifyUserSession } from "@/lib/user-auth";

const supabaseAuthConfigured=()=>Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_ANON_KEY);
async function supabaseAuth(path:string,options:RequestInit={}){
  return fetch(process.env.SUPABASE_URL!.replace(/\/$/,"")+"/auth/v1/"+path,{...options,cache:"no-store",headers:{apikey:process.env.SUPABASE_ANON_KEY!,"content-type":"application/json",...options.headers}});
}
type Credential = { user_id: string; password_salt: string; password_hash: string };
const noStore = { "Cache-Control": "no-store" };

async function database() {
  try { return (await import("cloudflare:workers")).env.DB; }
  catch { return null; }
}

export async function POST(request: NextRequest) {
  const raw:unknown=await request.json().catch(()=>null);
  const body = (raw&&typeof raw==="object"?raw:{}) as { action?: string; email?: unknown; password?: unknown };
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : null;
  const password = body.password;
  if (!email || typeof password !== "string" || password.length < 8 || password.length > 128) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400, headers: noStore });
  }
  if (body.action !== "register" && body.action !== "login") return NextResponse.json({ok:false,error:"invalid_action"},{status:400,headers:noStore});
  if(supabaseAuthConfigured()){
    try{
      const response=await supabaseAuth(body.action==="register"?"signup":"token?grant_type=password",{method:"POST",body:JSON.stringify({email,password})});
      const result=await response.json() as {access_token?:string;user?:{email?:string};msg?:string};
      if(!response.ok)return NextResponse.json({ok:false,error:"invalid_credentials"},{status:response.status===429?429:401,headers:noStore});
      if(!result.access_token)return NextResponse.json({ok:false,error:"confirmation_required"},{status:202,headers:noStore});
      return NextResponse.json({ok:true,token:result.access_token,email:result.user?.email||email},{headers:noStore});
    }catch{return NextResponse.json({ok:false,error:"unavailable"},{status:503,headers:noStore})}
  }
  const db = await database();
  if (!process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503, headers: noStore });
  }

  if (!db) return NextResponse.json({ok:false,error:"unavailable"},{status:503,headers:noStore});

  try {
    if (body.action === "register") {
      const existing = await db.prepare("SELECT email FROM user_credentials WHERE email = ?").bind(email).first();
      if (existing) return NextResponse.json({ ok: false, error: "exists" }, { status: 409, headers: noStore });
      const salt = newSalt();
      const hash = await passwordHash(password, salt);
      const id = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);
      await db.batch([
        db.prepare("INSERT INTO users (id, email, role, language, theme, created_at, updated_at) VALUES (?, ?, 'user', 'ru', 'dark', ?, ?)").bind(id, email, now, now),
        db.prepare("INSERT INTO user_credentials (email, user_id, password_salt, password_hash) VALUES (?, ?, ?, ?)").bind(email, id, salt, hash),
      ]);
      return NextResponse.json({ ok: true, token: await createUserSession(id), email }, { headers: noStore });
    }
    if (body.action !== "login") return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400, headers: noStore });
    const credential = await db.prepare("SELECT user_id, password_salt, password_hash FROM user_credentials WHERE email = ?").bind(email).first<Credential>();
    const salt = credential?.password_salt ?? "00000000000000000000000000000000";
    const hash = await passwordHash(password, salt);
    if (!credential || hash !== credential.password_hash) return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401, headers: noStore });
    return NextResponse.json({ ok: true, token: await createUserSession(credential.user_id), email }, { headers: noStore });
  } catch (error) {
    console.error("User authentication unavailable", error);
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503, headers: noStore });
  }
}

export async function GET(request: NextRequest) {
  if(supabaseAuthConfigured()){
    const token=request.headers.get("authorization");if(!token)return NextResponse.json({ok:false},{status:401,headers:noStore});
    try{const response=await supabaseAuth("user",{headers:{authorization:token}});const user=await response.json() as {email?:string};return response.ok&&user.email?NextResponse.json({ok:true,email:user.email},{headers:noStore}):NextResponse.json({ok:false},{status:401,headers:noStore})}catch{return NextResponse.json({ok:false},{status:503,headers:noStore})}
  }
  const userId = await verifyUserSession(request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1]);
  if (!userId) return NextResponse.json({ ok: false }, { status: 401, headers: noStore });
  const db = await database();
  if (!db) return NextResponse.json({ok:false,error:"unavailable"},{status:503,headers:noStore});

  try {
    const user = await db.prepare("SELECT email FROM users WHERE id = ?").bind(userId).first<{ email: string }>();
    return user ? NextResponse.json({ ok: true, email: user.email }, { headers: noStore }) : NextResponse.json({ ok: false }, { status: 401, headers: noStore });
  } catch (error) {
    console.error("User session unavailable", error);
    return NextResponse.json({ ok: false }, { status: 503, headers: noStore });
  }
}
