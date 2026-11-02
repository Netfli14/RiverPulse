import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'waterguard-portal-'));
const require=createRequire(import.meta.url);
fs.symlinkSync(path.resolve('node_modules'),path.join(root,'node_modules'),'dir');
const files=[...['portal-auth','portal-storage','demo-reports','user-auth','robot-protocol','telemetry-storage'].map(n=>[n,`lib/${n}.ts`]),...['session','reports','visit','stats','telemetry'].map(n=>[n,`app/api/portal/${n}/route.ts`])];
for(const [name,file] of files){const source=fs.readFileSync(file,'utf8').replaceAll('@/lib/','./');fs.writeFileSync(path.join(root,name+'.js'),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)}
const {NextRequest}=require('next/server');
const session=require(path.join(root,'session.js')),reports=require(path.join(root,'reports.js')),visit=require(path.join(root,'visit.js')),stats=require(path.join(root,'stats.js')),telemetry=require(path.join(root,'telemetry.js')),storage=require(path.join(root,'telemetry-storage.js'));
after(()=>fs.rmSync(root,{recursive:true,force:true}));
const visitor='11111111-1111-4111-8111-111111111111';
function request(route,method='GET',body,cookie=''){
 return new NextRequest('https://site.example/api/portal/'+route,{method,headers:{'content-type':'application/json',host:'site.example',origin:'https://site.example',cookie},...(body===undefined?{}:{body:JSON.stringify(body)})});
}
test('portal roles, persistent complaints, unique counters and live relay enforce the complete access flow',async()=>{
 const previous={fetch:globalThis.fetch,token:process.env.BLOB_READ_WRITE_TOKEN,secret:process.env.PORTAL_SESSION_SECRET};
 process.env.BLOB_READ_WRITE_TOKEN='vercel_blob_rw_teststore_testsecret';process.env.PORTAL_SESSION_SECRET='test-only-portal-session-secret';
 const blobs=new Map();
 globalThis.fetch=async(input,options={})=>{
  const url=new URL(input);assert.equal(options.headers.authorization,'Bearer '+process.env.BLOB_READ_WRITE_TOKEN);
  if(url.origin==='https://vercel.com'){
   const pathname=url.searchParams.get('pathname');
   if(options.method==='PUT'){
    assert.equal(options.headers['x-vercel-blob-access'],'private');
    if(options.headers['x-allow-overwrite']==='0'&&blobs.has(pathname))return Response.json({error:{message:'This blob already exists'}},{status:409});
    blobs.set(pathname,JSON.parse(options.body));return Response.json({pathname});
   }
   return Response.json({blobs:[...blobs.keys()].filter(p=>p.startsWith(url.searchParams.get('prefix'))).map(pathname=>({pathname})),hasMore:false});
  }
  assert.equal(url.origin,'https://teststore.private.blob.vercel-storage.com');assert.equal(url.searchParams.get('cache'),'0');
  const value=blobs.get(decodeURIComponent(url.pathname.slice(1)));return value?Response.json(value):new Response(null,{status:404});
 };
 const cookieFor=response=>response.cookies.get('waterguard_session').value;
 const login=async(body,v=visitor)=>session.POST(request('session','POST',body,`waterguard_visitor=${v}`));
 try{
  assert.equal((await reports.GET(request('reports'))).status,401);
  assert.equal((await login({role:'admin',code:'wrong'})).status,401);
  const admin=await login({role:'admin',code:'123'});assert.equal(admin.status,200);const adminCookie='waterguard_session='+cookieFor(admin);
  const jury=await login({role:'jury'});assert.equal(jury.status,200);const juryCookie='waterguard_session='+cookieFor(jury);
  const user=await login({role:'user',action:'register',email:'flow@example.test',password:'test-only-password'});assert.equal(user.status,200);const userCookie='waterguard_session='+cookieFor(user);
  assert.equal((await login({role:'user',action:'register',email:'flow@example.test',password:'test-only-password'})).status,409);
  assert.equal((await login({role:'user',action:'login',email:'flow@example.test',password:'incorrect'})).status,401);
  assert.equal((await login({role:'user',action:'login',email:'flow@example.test',password:'test-only-password'})).status,200);
  const reportBody={category:'floating_litter',description:'Floating plastic bottles beside the bridge.',location:'Ishim, test-only location',observedAt:new Date().toISOString()};
  assert.equal((await reports.POST(request('reports','POST',reportBody,juryCookie))).status,401);
  const sent=await reports.POST(request('reports','POST',reportBody,userCookie));assert.equal(sent.status,201);const {id}=await sent.json();
  const own=await (await reports.GET(request('reports','GET',undefined,userCookie))).json();assert.equal(own.reports.length,1);assert.equal(own.reports[0].id,id);
  const other=await login({role:'user',action:'register',email:'other@example.test',password:'test-only-password'},'22222222-2222-4222-8222-222222222222');const otherCookie='waterguard_session='+cookieFor(other);
  assert.equal((await (await reports.GET(request('reports','GET',undefined,otherCookie))).json()).reports.length,0);
  const all=await (await reports.GET(request('reports','GET',undefined,adminCookie))).json();assert.equal(all.reports.length,31);assert.equal(all.reports.filter(r=>r.demo).length,30);assert.ok(all.reports.every(r=>!('userId' in r)));
  const juryReports=await (await reports.GET(request('reports','GET',undefined,juryCookie))).json();assert.equal(juryReports.reports.length,30);assert.ok(juryReports.reports.every(r=>r.demo));
  assert.equal((await reports.PATCH(request('reports','PATCH',{id,status:'resolved'},userCookie))).status,403);
  assert.equal((await reports.PATCH(request('reports','PATCH',{id,status:'resolved'},adminCookie))).status,200);
  assert.equal((await (await reports.GET(request('reports','GET',undefined,userCookie))).json()).reports[0].status,'resolved');
  await visit.POST(request('visit','POST',undefined,`waterguard_visitor=${visitor}`));
  const counts=await (await stats.GET()).json();assert.deepEqual(counts.entries,{user:2,admin:1,jury:1});assert.equal(counts.visitors,2);assert.equal(counts.accounts,2);assert.equal(counts.reports,1);
  const packet={robotId:'rc-01',bootId:'real-device-test-fixture',seq:2,ph:7.1};
  assert.equal((await telemetry.POST(request('telemetry','POST',packet,userCookie))).status,403);
  assert.equal((await telemetry.POST(request('telemetry','POST',{...packet,ph:99},adminCookie))).status,400);
  assert.equal((await telemetry.POST(request('telemetry','POST',packet,adminCookie))).status,201);
  assert.deepEqual((await storage.latestTelemetry()).payload,packet);
  const tampered=adminCookie.slice(0,-1)+(adminCookie.endsWith('0')?'1':'0');assert.equal((await reports.PATCH(request('reports','PATCH',{id,status:'received'},tampered))).status,403);
  const logout=await session.DELETE();assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
 }finally{globalThis.fetch=previous.fetch;for(const [key,value] of [['BLOB_READ_WRITE_TOKEN',previous.token],['PORTAL_SESSION_SECRET',previous.secret]]){if(value===undefined)delete process.env[key];else process.env[key]=value}}
});
