"use client";
import {useEffect,useRef,useState} from "react";
import {ExternalLink,MapPin} from "lucide-react";
import type {Language} from "@/lib/riverpulse-i18n";
import {useRobot} from "@/components/robot-provider";
import {getWaterBody,waterBodies,waterPosition,type WaterBodyId} from "@/lib/water-bodies";
export type StationStatus="normal"|"attention"|"risk"|"offline";
export type WaterStation={id:string;bodyId:WaterBodyId;name:Record<Language,string>;waterBody:Record<Language,string>;coordinates:[number,number];status:StationStatus};
export const waterStations:WaterStation[]=waterBodies.map(body=>({id:body.id==="esil"?"esil-central":"sarykol-point",bodyId:body.id,name:body.name,waterBody:{RU:`${body.name.RU}, ${body.location.RU}`,KZ:`${body.name.KZ}, ${body.location.KZ}`,EN:`${body.name.EN}, ${body.location.EN}`},coordinates:[body.coordinates.lng,body.coordinates.lat],status:"offline"}));
const text=(l:Language,ru:string,kz:string,en:string)=>l==="RU"?ru:l==="KZ"?kz:en;
type MapApi={Map:new(el:HTMLElement,options:object)=>{panTo:(p:object)=>void};marker:{AdvancedMarkerElement:new(options:object)=>{position:object|null;map:unknown;title:string}};importLibrary:(name:string)=>Promise<unknown>};
declare global {interface Window {google?:{maps:MapApi};riverpulseMapsReady?:()=>void;gm_authFailure?:()=>void}}
let mapsPromise:Promise<MapApi>|null=null;
function loadMaps(key:string){
  if(window.google?.maps?.marker)return Promise.resolve(window.google.maps);
  if(mapsPromise)return mapsPromise;
  mapsPromise=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error("maps_timeout")),15000);
    window.gm_authFailure=()=>{clearTimeout(timer);reject(new Error("maps_auth"))};
    window.riverpulseMapsReady=async()=>{try{await window.google!.maps.importLibrary("marker");clearTimeout(timer);resolve(window.google!.maps)}catch(e){clearTimeout(timer);reject(e)}};
    const script=document.createElement("script");script.src="https://maps.googleapis.com/maps/api/js?"+new URLSearchParams({key,loading:"async",callback:"riverpulseMapsReady",v:"weekly"});script.async=true;
    script.onerror=()=>{clearTimeout(timer);reject(new Error("maps_network"))};document.head.appendChild(script);
  });return mapsPromise;
}
export default function RealWaterMap({language,className="",stations=waterStations,selectedId,onSelect=()=>{}}:{language:Language;className?:string;stations?:WaterStation[];selectedId?:string;onSelect?:(s:WaterStation)=>void}){
  const {reading,fresh}=useRobot();const gps=reading?.gps;
  const selected=stations.find(station=>station.id===selectedId)||stations[0]||waterStations[0];
  const body=getWaterBody(selected.bodyId)!;
  const {lat,lng}=waterPosition(body,gps);
  const robotGps=Boolean(body.robotId&&gps);
  const caption=robotGps?`RC-01 · ${text(language,fresh?"GPS робота":"Последний GPS","Робот GPS","Robot GPS")}`:`${selected.name[language]} · ${text(language,"точка команды","команда нүктесі","team location")}`;
  const currentLocation=useRef({lat,lng,caption});
  const host=useRef<HTMLDivElement>(null),map=useRef<{panTo:(p:object)=>void}|null>(null),marker=useRef<{position:object|null;map:unknown;title:string}|null>(null);
  const [mode,setMode]=useState<"embed"|"javascript">("embed"),[error,setError]=useState("");
  useEffect(()=>{
    let alive=true;
    fetch("/api/public-config").then(async r=>await r.json() as {googleMapsKey:string;googleMapsId:string}).then(async config=>{
      if(!config.googleMapsKey)return;
      try{const api=await loadMaps(config.googleMapsKey);if(!alive||!host.current)return;
        const current=currentLocation.current;
        map.current=new api.Map(host.current,{center:{lat:current.lat,lng:current.lng},zoom:15,mapId:config.googleMapsId||"DEMO_MAP_ID",mapTypeId:"roadmap",streetViewControl:false});
        marker.current=new api.marker.AdvancedMarkerElement({map:map.current,position:{lat:current.lat,lng:current.lng},title:current.caption});setMode("javascript");
      }catch{if(alive)setError(text(language,"Google Maps API недоступен. Открыта встроенная карта.","Google Maps API қолжетімсіз. Кірістірілген карта ашылды.","Google Maps API unavailable. Showing embedded map."))}
    }).catch(()=>{});return()=>{alive=false;if(marker.current)marker.current.map=null};
  // One map instance; live coordinates are updated by the effect below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  useEffect(()=>{currentLocation.current={lat,lng,caption};const position={lat,lng};if(marker.current){marker.current.position=stations.length?position:null;marker.current.title=caption}map.current?.panTo(position)},[lat,lng,caption,stations.length]);
  const googleUrl="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(`${lat},${lng}`);
  return <section className={"rp-google-map "+className} aria-label={text(language,"Карта водоёма","Су айдыны картасы","Water body map")}>
    <div ref={host} className="rp-google-canvas" style={{visibility:mode==="javascript"?"visible":"hidden"}}/>
    {mode==="embed"&&<iframe className="rp-google-canvas" title={`Google Maps · ${selected.name[language]}`} src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed&hl=${language==="RU"?"ru":language==="KZ"?"kk":"en"}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen/>}
    <div className="rp-map-caption"><MapPin size={16}/><button onClick={()=>onSelect(selected)}>{caption}</button><a href={googleUrl} target="_blank" rel="noreferrer" aria-label="Google Maps"><ExternalLink size={16}/></a></div>
    {error&&<p className="rp-map-error" role="status">{error}</p>}
  </section>;
}
