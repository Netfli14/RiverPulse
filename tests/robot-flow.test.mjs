import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'riverpulse-tests-'));
const require=createRequire(import.meta.url);
fs.symlinkSync(path.resolve('node_modules'),path.join(root,'node_modules'),'dir');
for(const name of ['robot-protocol','bluetooth-client','admin-auth','user-auth']){
  const source=fs.readFileSync(`lib/${name}.ts`,'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  fs.writeFileSync(path.join(root,name+'.js'),compiled);
}
const {TelemetryDecoder,validateTelemetry,isFresh,secureEndpoint,BLE_SERVICE,BLE_TELEMETRY,BLE_COMMAND,detectionSchema}=require(path.join(root,'robot-protocol.js'));
const {RobotBluetoothClient}=require(path.join(root,'bluetooth-client.js'));
const adminAuth=require(path.join(root,'admin-auth.js'));
const userAuth=require(path.join(root,'user-auth.js'));
after(()=>fs.rmSync(root,{recursive:true,force:true}));
const packet={robotId:'rc-01',bootId:'real-device-boot',seq:4,battery:72,ph:7.2,gps:{lat:51.1497,lng:71.4183}};
test('valid sensor packet, missing readings stay absent',()=>{
  assert.equal(validateTelemetry(packet).ph,7.2);
  assert.equal(validateTelemetry({robotId:'rc-01',seq:0}).turbidity,undefined);
});
test('reject foreign robots, implausible values and unknown data',()=>{
 for(const invalid of [{...packet,robotId:'rc-02'},{...packet,battery:101},{...packet,ph:15},{...packet,gps:{lat:100,lng:0}},{...packet,waterQuality:94}])assert.throws(()=>validateTelemetry(invalid));
});
test('reassemble BLE 20-byte chunks with multiple packets',()=>{
 const decoder=new TelemetryDecoder();const encoded=new TextEncoder().encode(JSON.stringify(packet)+'\n'+JSON.stringify({...packet,seq:5})+'\n');let result=[];
 for(let i=0;i<encoded.length;i+=20)result.push(...decoder.push(encoded.subarray(i,i+20)));
 assert.deepEqual(result.map(p=>p.seq),[4,5]);
});
test('decoder handles view offsets, malformed and oversized frames',()=>{
 const decoder=new TelemetryDecoder();const raw=new TextEncoder().encode('pad'+JSON.stringify(packet)+'\n');assert.equal(decoder.push(new DataView(raw.buffer,3))[0].seq,4);
 assert.throws(()=>decoder.push(new TextEncoder().encode('bad json\n')));decoder.reset();
 assert.throws(()=>decoder.push(new Uint8Array(17000).fill(65)));
});
test('a malformed notification does not discard valid packets in the same BLE batch',()=>{
 const errors=[];const decoder=new TelemetryDecoder();
 const bytes=new TextEncoder().encode(JSON.stringify(packet)+'\ninvalid\n'+JSON.stringify({...packet,seq:5})+'\n');
 assert.deepEqual(decoder.push(bytes,e=>errors.push(e)).map(p=>p.seq),[4,5]);assert.equal(errors.length,1);
});
test('UTF-8 boot IDs survive notifications split inside a multibyte character',()=>{
 const decoder=new TelemetryDecoder();const bytes=new TextEncoder().encode(JSON.stringify({...packet,bootId:'құрылғы-01'})+'\n');const received=[];
 for(const byte of bytes)received.push(...decoder.push(Uint8Array.of(byte)));
 assert.equal(received[0].bootId,'құрылғы-01');
});
test('old measurements and future timestamps are not fresh',()=>{
 const r={...packet,source:'bluetooth',receivedAt:1000};assert.equal(isFresh(r,2000),true);assert.equal(isFresh(r,16000),false);assert.equal(isFresh(r,0),false);assert.equal(isFresh(null),false);
});
test('network rejects insecure URLs and embedded credentials',()=>{
 assert.throws(()=>secureEndpoint('http://robot.local/video'));assert.throws(()=>secureEndpoint('https://user:secret@robot.local/video'));
 assert.equal(secureEndpoint('wss://robot.example/telemetry',['wss:']),'wss://robot.example/telemetry');
});
test('YOLO rejects invalid normalized boxes',()=>{
 const frame={robotId:'rc-01',frameId:1,capturedAt:new Date().toISOString(),boxes:[{label:'bottle',confidence:.9,x:.2,y:.2,width:.2,height:.3}]};assert.equal(detectionSchema.parse(frame).boxes.length,1);
 assert.throws(()=>detectionSchema.parse({...frame,boxes:[{...frame.boxes[0],width:.9}]}));
});
class Characteristic extends EventTarget {
  properties={};value=undefined;notifications=false;written=null;
  async startNotifications(){this.notifications=true;return this}
  async stopNotifications(){this.notifications=false;return this}
  async writeValueWithResponse(value){this.written=new TextDecoder().decode(value)}
  emit(value){this.value=new DataView(value.buffer,value.byteOffset,value.byteLength);this.dispatchEvent(new Event('characteristicvaluechanged'))}
}
function bleFixture(){
 const notifications=new Characteristic(),command=new Characteristic();
 const service={async getCharacteristic(id){if(id===BLE_TELEMETRY)return notifications;if(id===BLE_COMMAND)return command;throw new Error('unknown UUID')}};
 const device=new EventTarget();device.name='RiverPulse-RC-01';device.gatt={connected:false,async connect(){this.connected=true;return {async getPrimaryService(){return service}}},disconnect(){this.connected=false}};
 return {device,notifications,command,adapter:{async requestDevice(){return device}}};
}
test('disconnect cancels a pending chooser without later opening GATT',async()=>{
 const f=bleFixture();let resolve;const requested=new Promise(r=>resolve=r);
 const client=new RobotBluetoothClient(()=>assert.fail('late data'),()=>{},()=>{});
 const connecting=client.connect({requestDevice:()=>requested});client.disconnect();resolve(f.device);
 await assert.rejects(connecting,/connection_cancelled/);assert.equal(f.device.gatt.connected,false);
});
test('cancelled chooser and missing firmware service produce different errors',async()=>{
 const client=new RobotBluetoothClient(()=>{},()=>{},()=>{});
 await assert.rejects(client.connect({async requestDevice(){throw new DOMException('Cancelled','NotFoundError')}}),/^Error: cancelled$/);
 const f=bleFixture();f.device.gatt.connect=async function(){this.connected=true;return {async getPrimaryService(){throw new DOMException('Missing service','NotFoundError')}}};
 await assert.rejects(client.connect(f.adapter),e=>e.name==='NotFoundError');assert.equal(f.device.gatt.connected,false);
});
test('late GATT completion cannot replace a new connection',async()=>{
 const first=bleFixture(),second=bleFixture();let resolve;let started;
 const beginning=new Promise(r=>started=r);const oldService=new Promise(r=>resolve=r);
 first.device.gatt.connect=async function(){this.connected=true;return {getPrimaryService(){started();return oldService}}};
 const received=[];const client=new RobotBluetoothClient(p=>received.push(p),()=>{},()=>{});
 const old=client.connect(first.adapter);await beginning;client.disconnect();await client.connect(second.adapter);
 resolve({async getCharacteristic(){return first.notifications}});await assert.rejects(old,/connection_cancelled/);
 second.notifications.emit(new TextEncoder().encode(JSON.stringify(packet)+'\n'));
 assert.equal(received.length,1);assert.equal(second.device.gatt.connected,true);assert.equal(first.device.gatt.connected,false);client.disconnect();
});
test('reconnection resets partial framing and invalid STOP IDs never reach firmware',async()=>{
 const first=bleFixture(),second=bleFixture(),received=[],errors=[];
 const client=new RobotBluetoothClient(p=>received.push(p),()=>{},e=>errors.push(e));await client.connect(first.adapter);
 first.notifications.emit(new TextEncoder().encode('{"robotId":'));client.disconnect();await client.connect(second.adapter);
 second.notifications.emit(new TextEncoder().encode('bad\n'+JSON.stringify(packet)+'\n'));
 assert.equal(received.length,1);assert.deepEqual(errors,['invalid_packet']);
 await assert.rejects(()=>client.stop('too-long-or-invalid'),/invalid_command_id/);assert.equal(second.command.written,null);client.disconnect();
});
test('GATT flow connects, subscribes, receives, writes STOP and cleans up',async()=>{
 const notifications=new Characteristic(),command=new Characteristic();const service={async getCharacteristic(id){if(id===BLE_TELEMETRY)return notifications;assert.equal(id,BLE_COMMAND);return command}};
 const device=new EventTarget();device.name='RiverPulse-RC-01';device.gatt={connected:false,async connect(){this.connected=true;return {async getPrimaryService(id){assert.equal(id,BLE_SERVICE);return service}}},disconnect(){this.connected=false}};
 let options,disconnected=0;const received=[];const client=new RobotBluetoothClient(p=>received.push(p),()=>disconnected++,()=>assert.fail('unexpected error'));
 assert.equal(await client.connect({async requestDevice(o){options=o;return device}}),'RiverPulse-RC-01');assert.ok(options.optionalServices.includes(BLE_SERVICE));assert.equal(notifications.notifications,true);
 const bytes=new TextEncoder().encode(JSON.stringify(packet)+'\n');for(let i=0;i<bytes.length;i+=20)notifications.emit(bytes.subarray(i,i+20));assert.equal(received[0].battery,72);
 await client.stop('abcd1234');assert.equal(command.written,'STOP:abcd1234');assert.equal(new TextEncoder().encode(command.written).length<21,true);
 device.dispatchEvent(new Event('gattserverdisconnected'));assert.equal(disconnected,1);
 notifications.emit(bytes);assert.equal(received.length,1);client.disconnect();assert.equal(device.gatt.connected,false);
 await assert.rejects(()=>client.stop('abcd1234'));
});

for(const [name,file] of [['telemetry-storage','lib/telemetry-storage.ts'],['telemetry-route','app/api/robots/rc-01/telemetry/route.ts'],['admin-login-route','app/api/admin-login/route.ts'],['user-auth-route','app/api/user-auth/route.ts']]){
  const source=fs.readFileSync(file,'utf8').replaceAll('@/lib/','./');
  fs.writeFileSync(path.join(root,name+'.js'),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
}
const telemetryAPI=require(path.join(root,'telemetry-route.js'));
test('sessions reject tampering, extra segments, future and expired admin timestamps',async()=>{
  const previous=process.env.ADMIN_SESSION_SECRET;process.env.ADMIN_SESSION_SECRET='test-only-session-secret';
  const originalNow=Date.now;
  try{
    const token=await adminAuth.createAdminSession();assert.equal(await adminAuth.verifyAdminSession(token),true);
    assert.equal(await adminAuth.verifyAdminSession(token+'.extra'),false);
    assert.equal(await adminAuth.verifyAdminSession(token.slice(0,-1)+(token.endsWith('0')?'1':'0')),false);
    const issued=Number(token.split('.')[0]);Date.now=()=>issued-1;assert.equal(await adminAuth.verifyAdminSession(token),false);
    Date.now=()=>issued+8*60*60*1000;assert.equal(await adminAuth.verifyAdminSession(token),false);Date.now=originalNow;
    const user=await userAuth.createUserSession('test-user');assert.equal(await userAuth.verifyUserSession(user),'test-user');
    assert.equal(await userAuth.verifyUserSession(user+'.extra'),null);assert.equal(await userAuth.verifyUserSession('other.'+user.split('.').slice(1).join('.')),null);
  }finally{Date.now=originalNow;if(previous===undefined)delete process.env.ADMIN_SESSION_SECRET;else process.env.ADMIN_SESSION_SECRET=previous}
});
test('login handles malformed JSON and authenticates only the configured operator',async()=>{
  const keys=['ADMIN_PASSWORD','ADMIN_SESSION_SECRET','SUPABASE_URL','SUPABASE_ANON_KEY'];const previous=keys.map(key=>process.env[key]);
  process.env.ADMIN_PASSWORD='test-only-operator-password';process.env.ADMIN_SESSION_SECRET='test-only-session-secret';delete process.env.SUPABASE_URL;delete process.env.SUPABASE_ANON_KEY;
  const adminAPI=require(path.join(root,'admin-login-route.js')),userAPI=require(path.join(root,'user-auth-route.js'));
  const request=body=>new Request('https://site.example/api/login',{method:'POST',headers:{'content-type':'application/json'},body});
  try{
    for(const body of ['null','42','{']){assert.equal((await adminAPI.POST(request(body))).status,401);assert.equal((await userAPI.POST(request(body))).status,400)}
    assert.equal((await adminAPI.POST(request(JSON.stringify({password:'wrong'})))).status,401);
    const success=await adminAPI.POST(request(JSON.stringify({password:process.env.ADMIN_PASSWORD})));assert.equal(success.status,200);assert.match(success.headers.get('set-cookie'),/HttpOnly/i);
    assert.equal(await adminAuth.verifyAdminSession((await success.json()).token),true);
    assert.equal((await userAPI.POST(request(JSON.stringify({action:'login',email:'qa@example.test',password:'test-only-password'})))).status,503);
    assert.equal((await userAPI.GET(new Request('https://site.example/api/login'))).status,401);
  }finally{keys.forEach((key,i)=>{if(previous[i]===undefined)delete process.env[key];else process.env[key]=previous[i]})}
});
test('HTTP ingestion authenticates, persists and returns the same real packet',async()=>{
  const previous={fetch:globalThis.fetch,url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY,token:process.env.ROBOT_INGEST_TOKEN};
  const expected='test-only-token-for-http-flow-0123456789';let stored;
  process.env.SUPABASE_URL='https://storage.example';process.env.SUPABASE_SERVICE_ROLE_KEY='test-service-role';process.env.ROBOT_INGEST_TOKEN=expected;
  globalThis.fetch=async (url,options)=>{
    assert.ok(String(url).startsWith('https://storage.example/rest/v1/robot_telemetry'));
    assert.equal(options.headers.authorization,'Bearer test-service-role');
    if(options.method==='POST'){stored=JSON.parse(options.body);return new Response(null,{status:201})}
    return Response.json(stored?[{payload:stored.payload,received_at:stored.received_at}]:[]);
  };
  try{
    const empty=await telemetryAPI.GET();assert.equal((await empty.json()).reading,null);
    const denied=await telemetryAPI.POST(new Request('https://site.example/api/robots/rc-01/telemetry',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(packet)}));assert.equal(denied.status,401);assert.equal(stored,undefined);
    const post=await telemetryAPI.POST(new Request('https://site.example/api/robots/rc-01/telemetry',{method:'POST',headers:{authorization:'Bearer '+expected,'content-type':'application/json'},body:JSON.stringify(packet)}));assert.equal(post.status,201);assert.equal(stored.robot_id,'rc-01');
    const get=await telemetryAPI.GET();assert.equal(get.headers.get('cache-control'),'no-store');const actual=await get.json();assert.deepEqual(actual.reading,packet);assert.ok(actual.receivedAt<=Date.now());
    for(const invalid of [{...packet,ph:99},{...packet,measuredAt:new Date(Date.now()-120000).toISOString()}]){
      const result=await telemetryAPI.POST(new Request('https://site.example/api/robots/rc-01/telemetry',{method:'POST',headers:{authorization:'Bearer '+expected,'content-type':'application/json'},body:JSON.stringify(invalid)}));assert.equal(result.status,400);
    }
    const oversized=await telemetryAPI.POST(new Request('https://site.example/api/robots/rc-01/telemetry',{method:'POST',headers:{authorization:'Bearer '+expected,'content-type':'application/json'},body:' '.repeat(4097)}));assert.equal(oversized.status,413);
  }finally{
    globalThis.fetch=previous.fetch;
    for(const [key,value] of [['SUPABASE_URL',previous.url],['SUPABASE_SERVICE_ROLE_KEY',previous.key],['ROBOT_INGEST_TOKEN',previous.token]]){if(value===undefined)delete process.env[key];else process.env[key]=value}
  }
});
