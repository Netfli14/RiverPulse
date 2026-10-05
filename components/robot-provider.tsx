"use client";
import {createContext,useContext,useEffect,useRef,useState,useCallback,type ReactNode} from "react";
import {RobotBluetoothClient,type BluetoothAdapter} from "@/lib/bluetooth-client";
import {isFresh,secureEndpoint,validateTelemetry,type Reading,type Telemetry} from "@/lib/robot-protocol";
type Connection="disconnected"|"connecting"|"connected"|"error";
type RobotState={reading:Reading|null;history:Reading[];connection:Connection;deviceName:string;error:string;fresh:boolean;transport:string;
  connectBluetooth:()=>Promise<void>;connectNetwork:(url:string)=>void;disconnect:()=>void;stop:()=>Promise<void>;stopState:string};
const Context=createContext<RobotState|null>(null);
export function RobotProvider({children}:{children:ReactNode}) {
  const [reading,setReading]=useState<Reading|null>(null),[history,setHistory]=useState<Reading[]>([]);
  const [connection,setConnection]=useState<Connection>("disconnected"),[deviceName,setDeviceName]=useState("");
  const [error,setError]=useState(""),[now,setNow]=useState(0),[transport,setTransport]=useState("");
  const [stopState,setStopState]=useState("");const stopId=useRef("");const stopTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const client=useRef<RobotBluetoothClient|null>(null),socket=useRef<WebSocket|null>(null),lastSeq=useRef(-1);
  const activeTransport=useRef("");const lastBoot=useRef("");
  const accept=useCallback((packet:Telemetry,source:Reading["source"],receivedAt=Date.now())=>{
    if(packet.ack?.id===stopId.current){stopId.current="";if(stopTimer.current)clearTimeout(stopTimer.current);setStopState(packet.ack.ok?"confirmed":"rejected")}
    if(packet.bootId&&packet.bootId!==lastBoot.current){lastSeq.current=-1;lastBoot.current=packet.bootId}
    if(packet.seq<=lastSeq.current)return;
    lastSeq.current=packet.seq;const sample={...packet,receivedAt,source};
    setReading(sample);setHistory(old=>[...old,sample].slice(-900));setNow(Date.now());setError("");
  },[]);
  const disconnect=useCallback(()=>{
    if(stopTimer.current)clearTimeout(stopTimer.current);
    if(stopId.current)setStopState("failed");stopId.current="";
    activeTransport.current="";client.current?.disconnect();client.current=null;
    if(socket.current){socket.current.onclose=null;socket.current.close();socket.current=null}
    setConnection("disconnected");setTransport("");setDeviceName("");
  },[]);
  function begin(kind:string){disconnect();lastSeq.current=-1;lastBoot.current="";setStopState("");setError("");activeTransport.current=kind;setTransport(kind);setConnection("connecting")}
  async function connectBluetooth(){
    if(!window.isSecureContext){setError("https_required");return}
    const adapter=(navigator as Navigator&{bluetooth?:BluetoothAdapter}).bluetooth;
    if(!adapter){setError("bluetooth_unsupported");return}
    begin("bluetooth");
    const current=new RobotBluetoothClient(packet=>{if(client.current===current)accept(packet,"bluetooth")},()=>{if(client.current!==current)return;disconnect();setError("disconnected")},code=>{if(client.current===current)setError(code)});
    client.current=current;
    try{const name=await current.connect(adapter);if(client.current===current){setDeviceName(name);setConnection("connected")}}
    catch(e){if(client.current!==current)return;activeTransport.current="";setTransport("");setConnection("error");setError(e instanceof Error&&e.message==="cancelled"?"cancelled":"connection_failed")}
  }
  function connectNetwork(url:string){
    try{
      const endpoint=secureEndpoint(url,["wss:"]);begin("network");const ws=new WebSocket(endpoint);socket.current=ws;
      ws.onopen=()=>{if(socket.current!==ws)return;setDeviceName("RC-01 · Wi-Fi / gateway");setConnection("connected")};
      ws.onmessage=e=>{if(socket.current!==ws)return;try{if(typeof e.data!=="string"||e.data.length>16384)throw new Error();accept(validateTelemetry(JSON.parse(e.data)),"network")}catch{setError("invalid_packet")}};
      ws.onerror=()=>{if(socket.current!==ws)return;setError("connection_failed");setConnection("error")};
      ws.onclose=()=>{if(socket.current!==ws)return;activeTransport.current="";setTransport("");setConnection("disconnected");setError("disconnected")};
    }catch{setError("https_required")}
  }
  async function stop(){
    if(stopId.current)return;
    setStopState("sending");
    try{
      if(transport!=="bluetooth"||!client.current)throw new Error();
      const id=crypto.randomUUID().slice(0,8);stopId.current=id;setStopState("pending");
      stopTimer.current=setTimeout(()=>{if(stopId.current===id){stopId.current="";setStopState("timeout")}},5000);
      await client.current.stop(id);
    }catch{stopId.current="";if(stopTimer.current)clearTimeout(stopTimer.current);setStopState("failed")}
  }
  useEffect(()=>{
    const timer=setInterval(()=>setNow(Date.now()),1000);
    return()=>{clearInterval(timer);client.current?.disconnect();client.current=null;if(socket.current){socket.current.onclose=null;socket.current.close();socket.current=null}if(stopTimer.current)clearTimeout(stopTimer.current)};
  },[]);
  // Remote ESP32 HTTPS ingestion is visible to every browser via this persisted endpoint.
  useEffect(()=>{
    let alive=true;const controller=new AbortController();
    async function poll(){if(activeTransport.current)return;try{
      const response=await fetch("/api/robots/rc-01/telemetry",{cache:"no-store",signal:controller.signal});
      if(!response.ok)return;const result=await response.json() as {reading:unknown;receivedAt:number};
      if(alive&&!activeTransport.current&&result.reading&&Number.isFinite(result.receivedAt)){accept(validateTelemetry(result.reading),"cloud",result.receivedAt)}
    }catch{}}
    void poll();const timer=setInterval(poll,5000);return()=>{alive=false;controller.abort();clearInterval(timer)};
  },[accept]);
  const fresh=isFresh(reading,now)&&(reading?.source==="cloud"||(connection==="connected"&&reading?.source===transport));
  return <Context.Provider value={{reading,history,connection,deviceName,error,fresh,transport,connectBluetooth,connectNetwork,disconnect,stop,stopState}}>{children}</Context.Provider>;
}
export function useRobot(){const value=useContext(Context);if(!value)throw new Error("RobotProvider unavailable");return value}
