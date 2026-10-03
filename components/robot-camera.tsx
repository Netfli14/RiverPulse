"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {Camera,Video,Square,Maximize2} from "lucide-react";
import {secureEndpoint,detectionSchema,type DetectionFrame} from "@/lib/robot-protocol";
import type {Language} from "@/lib/riverpulse-i18n";
import {Switch} from "@/components/ui/switch";
const copy=(l:Language,ru:string,kz:string,en:string)=>l==="RU"?ru:l==="KZ"?kz:en;
export function RobotCamera({language}:{language:Language}){
  const [mode,setMode]=useState<"remote"|"local">("remote"),[url,setUrl]=useState(""),[source,setSource]=useState("");
  const [gateway,setGateway]=useState(""),[token,setToken]=useState(""),[yolo,setYolo]=useState(false),[frame,setFrame]=useState<DetectionFrame|null>(null);
  const [protectedStream,setProtectedStream]=useState(true);
  const [status,setStatus]=useState(""),[error,setError]=useState(""),[localOn,setLocalOn]=useState(false);
  const video=useRef<HTMLVideoElement>(null),stream=useRef<MediaStream|null>(null),panel=useRef<HTMLElement>(null);
  const alive=useRef(true);
  function stop(){stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;if(video.current)video.current.srcObject=null;setLocalOn(false);setSource("");setFrame(null);setStatus("");setYolo(false)}
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;stream.current?.getTracks().forEach(track=>track.stop())}},[]);
  async function local(){stop();setError("");try{if(!navigator.mediaDevices?.getUserMedia)throw new Error();const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});if(!alive.current){media.getTracks().forEach(t=>t.stop());return}stream.current=media;if(video.current){video.current.srcObject=media;await video.current.play()}setLocalOn(true);setStatus(copy(language,"Камера этого устройства","Осы құрылғының камерасы","This device's camera"))}catch{setError(copy(language,"Камера недоступна или доступ не разрешён.","Камера қолжетімсіз немесе рұқсат берілмеді.","Camera unavailable or permission denied."))}}
  async function connect(e:FormEvent){
    e.preventDefault();stop();setError("");
    try{
      const endpoint=secureEndpoint(url,["https:"]);
      if(protectedStream){
        if(!token)throw new Error("token");
        const base=new URL(endpoint);base.pathname=base.pathname.replace(/\/video\/?$/,"/stream-ticket");base.search="";
        const response=await fetch(base.toString(),{method:"POST",headers:{authorization:"Bearer "+token}});
        if(!response.ok)throw new Error("ticket");const result=await response.json() as {ticket:string};
        if(!result.ticket)throw new Error("ticket");const streamUrl=new URL(endpoint);streamUrl.searchParams.set("ticket",result.ticket);setSource(streamUrl.toString());
      }else setSource(endpoint);
      setStatus(copy(language,"Ожидание видеокадра…","Бейне кадры күтілуде…","Waiting for video frame…"));
    }catch{setError(copy(language,"Поток недоступен. Проверь HTTPS, токен шлюза и CORS.","Ағын қолжетімсіз. HTTPS, шлюз токенін және CORS тексеріңіз.","Stream unavailable. Check HTTPS, gateway token and CORS."))}
  }

  useEffect(()=>{
    if(!yolo||!gateway||(!localOn&&!source))return;
    let cancelled=false;const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
    async function update(){try{
      const base=secureEndpoint(gateway,["https:"]).replace(/\/$/,"");
      const headers:Record<string,string>={};if(token)headers.authorization="Bearer "+token;
      let response:Response;
      if(localOn&&video.current){
        const canvas=document.createElement("canvas");canvas.width=video.current.videoWidth;canvas.height=video.current.videoHeight;
        if(!canvas.width||!canvas.height)throw new Error("frame");canvas.getContext("2d")!.drawImage(video.current,0,0);
        const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",.75));if(!blob)throw new Error("frame");
        const form=new FormData();form.append("image",blob,"frame.jpg");
        response=await fetch(base+"/detect",{method:"POST",headers,body:form,signal:controller.signal});
      }else response=await fetch(base+"/detections",{headers,cache:"no-store",signal:controller.signal});
      if(!response.ok)throw new Error("gateway");const data=detectionSchema.parse(await response.json());
      if(Date.now()-Date.parse(data.capturedAt)>5000||Date.parse(data.capturedAt)>Date.now()+5000)throw new Error("stale");
      if(!cancelled){setFrame(data);setError("")}
    }catch{if(!cancelled){setFrame(null);setError(copy(language,"YOLO не передаёт актуальные результаты. Проверь адрес, токен и CORS.","YOLO жаңа нәтиже жібермейді. Мекенжайды, токенді және CORS тексеріңіз.","YOLO results unavailable or stale. Check URL, token and CORS."))}}finally{if(!cancelled)timer=setTimeout(update,1000)}}
    void update();return()=>{cancelled=true;controller.abort();clearTimeout(timer);setFrame(null)};
  },[yolo,gateway,token,localOn,source,language]);
  return <section className="rp-card rp-panel rp-camera-panel" ref={panel}>
    <div className="rp-panel-head"><h2>{copy(language,"Камера и YOLO","Камера және YOLO","Camera and YOLO")}</h2><button className="rp-icon-button" aria-label="Fullscreen" onClick={()=>panel.current?.requestFullscreen().catch(()=>{})}><Maximize2 size={18}/></button></div>
    <div className="rp-periods"><button className={mode==="remote"?"active":""} onClick={()=>{stop();setMode("remote")}}>{copy(language,"Камера робота","Робот камерасы","Robot camera")}</button><button className={mode==="local"?"active":""} onClick={()=>{stop();setMode("local")}}>{copy(language,"Камера устройства","Құрылғы камерасы","Device camera")}</button></div>
    <div className="rp-camera-screen"><video ref={video} autoPlay muted playsInline className={localOn?"":"hidden"}/>{source&&<img src={source} alt="RC-01 camera stream" onLoad={()=>setStatus(copy(language,"Видеопоток подключён","Бейне ағыны қосылды","Video stream connected"))} onError={()=>{setSource("");setStatus("");setError(copy(language,"Не удалось открыть видеопоток.","Бейне ағынын ашу мүмкін болмады.","Could not load video stream."))}}/>}{!source&&!localOn&&<div className="rp-empty"><Camera size={34}/><b>{copy(language,"Камера не подключена","Камера қосылмаған","Camera not connected")}</b><span>{copy(language,"Подключи видеопоток робота или разреши камеру этого устройства.","Роботтың бейне ағынын қосыңыз немесе осы құрылғы камерасына рұқсат беріңіз.","Connect a robot video stream or allow this device's camera.")}</span></div>}</div>
    {mode==="remote"?<form className="rp-connection-form" onSubmit={e=>void connect(e)}><label>{copy(language,"HTTPS видеопоток MJPEG","HTTPS MJPEG бейне ағыны","HTTPS MJPEG stream")}<input type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://your-gateway/video" required/></label><label>{copy(language,"Токен шлюза","Шлюз токені","Gateway token")}<input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} required={protectedStream}/></label><label className="rp-switch"><Switch checked={protectedStream} onCheckedChange={setProtectedStream}/>{copy(language,"Защищённый шлюз RiverPulse","RiverPulse қауіпсіз шлюзі","Protected RiverPulse gateway")}</label><button className="rp-button secondary"><Video size={16}/>{copy(language,"Подключить поток","Ағынды қосу","Connect stream")}</button></form>:<button className="rp-button secondary" onClick={local}><Camera size={16}/>{copy(language,"Разрешить камеру","Камераға рұқсат беру","Allow camera")}</button>}
    {(source||localOn)&&<button className="rp-button secondary" onClick={stop}><Square size={15}/>{copy(language,"Отключить камеру","Камераны ажырату","Disconnect camera")}</button>}
    <p className="rp-secondary" role="status">{status}</p>
    <details className="rp-yolo-settings"><summary>YOLO · {copy(language,"подключение распознавания","тануды қосу","connect detection")}</summary><div className="rp-form"><label>{copy(language,"Адрес YOLO-шлюза","YOLO шлюзінің мекенжайы","YOLO gateway URL")}<input type="url" value={gateway} onChange={e=>setGateway(e.target.value)} placeholder="https://your-gateway"/></label>{mode==="local"&&<label>{copy(language,"Токен шлюза","Шлюз токені","Gateway token")}<input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)}/></label>}<label className="rp-switch"><Switch checked={yolo} disabled={!gateway||(!source&&!localOn)} onCheckedChange={setYolo}/>{copy(language,"Получать результаты YOLO","YOLO нәтижелерін алу","Receive YOLO results")}</label></div><p>{copy(language,"Поток /video из комплектного шлюза уже содержит рамки YOLO. Результаты ниже обновляются отдельно и не накладываются на другой кадр.","/video ағынында YOLO жақтаулары бар. Төмендегі нәтижелер бөлек жаңартылады.","The bundled /video stream includes frame-aligned YOLO boxes. The list below updates separately, without overlaying a different frame.")}</p></details>
    {frame&&<div className="rp-detection-results"><b>{copy(language,"Последний кадр","Соңғы кадр","Latest frame")} #{frame.frameId} · {new Date(frame.capturedAt).toLocaleTimeString()}</b>{frame.boxes.length?frame.boxes.map((box,i)=><span key={i}>{box.label} · {Math.round(box.confidence*100)}%</span>):<span>{copy(language,"Объекты не обнаружены","Нысандар табылмады","No detections")}</span>}</div>}
    {error&&<p className="rp-error" role="alert">{error}</p>}
    <a className="rp-source" href="https://docs.ultralytics.com/modes/predict" target="_blank" rel="noreferrer">{copy(language,"Источник: Ultralytics YOLO","Дереккөз: Ultralytics YOLO","Source: Ultralytics YOLO")}</a>
  </section>;
}
