const encoder=new TextEncoder();
const getSecret=()=>process.env.ADMIN_SESSION_SECRET||"";
async function key(){return crypto.subtle.importKey("raw",encoder.encode(getSecret()),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"])}
function hex(bytes:ArrayBuffer){return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,"0")).join("")}

export async function createAdminSession(){
  const timestamp=Date.now().toString();
  const signature=hex(await crypto.subtle.sign("HMAC",await key(),encoder.encode(timestamp)));
  return timestamp+"."+signature;
}

export async function verifyAdminSession(value:string|undefined){
  if(!value||!getSecret())return false;
  if(!/^\d{1,16}\.[a-f0-9]{64}$/.test(value))return false;
  const [timestamp,signature]=value.split(".");
  const issued=Number(timestamp),age=Date.now()-issued;
  if(!Number.isSafeInteger(issued)||age<0||age>=8*60*60*1000)return false;
  const expected=hex(await crypto.subtle.sign("HMAC",await key(),encoder.encode(timestamp)));
  if(expected.length!==signature.length)return false;
  let diff=0;for(let i=0;i<expected.length;i++)diff|=expected.charCodeAt(i)^signature.charCodeAt(i);
  return diff===0;
}

export function validAdminPassword(password:string){return Boolean(process.env.ADMIN_PASSWORD)&&password===process.env.ADMIN_PASSWORD}
