"use client";

import { type CSSProperties, type FormEvent, useEffect, useRef, useState } from "react";
import { ExternalLink, Globe2, Layers3, LocateFixed, Search } from "lucide-react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Language } from "@/lib/riverpulse-i18n";
import { t } from "@/lib/riverpulse-i18n";

export type StationStatus = "normal" | "attention" | "risk" | "offline";
export type WaterStation = {
  id:string; name:Record<Language,string>; waterBody:Record<Language,string>;
  coordinates:[number,number]; status:StationStatus; temperature:number; ph:number;
  turbidity:number; oxygen:number; conductivity:number; updated:Record<Language,string>;
};

export const waterStations: WaterStation[] = [
  {id:"esil-central",name:{RU:"Центральный парк",KZ:"Орталық саябақ",EN:"Central Park"},waterBody:{RU:"Река Есиль",KZ:"Есіл өзені",EN:"Esil River"},coordinates:[71.4183,51.1497],status:"normal",temperature:14.8,ph:7.3,turbidity:8.4,oxygen:7.1,conductivity:412,updated:{RU:"2 минуты назад",KZ:"2 минут бұрын",EN:"2 minutes ago"}},
  {id:"esil-atyrau",name:{RU:"Мост Атырау",KZ:"Атырау көпірі",EN:"Atyrau Bridge"},waterBody:{RU:"Река Есиль",KZ:"Есіл өзені",EN:"Esil River"},coordinates:[71.3976,51.1556],status:"attention",temperature:15.2,ph:7.1,turbidity:12.6,oxygen:6.8,conductivity:431,updated:{RU:"5 минут назад",KZ:"5 минут бұрын",EN:"5 minutes ago"}},
  {id:"esil-triathlon",name:{RU:"Триатлон-парк",KZ:"Триатлон паркі",EN:"Triathlon Park"},waterBody:{RU:"Река Есиль",KZ:"Есіл өзені",EN:"Esil River"},coordinates:[71.4298,51.1427],status:"risk",temperature:15.0,ph:6.9,turbidity:18.2,oxygen:6.1,conductivity:458,updated:{RU:"7 минут назад",KZ:"7 минут бұрын",EN:"7 minutes ago"}},
  {id:"esil-ishim",name:{RU:"Набережная Ишим",KZ:"Есіл жағалауы",EN:"Ishim Embankment"},waterBody:{RU:"Река Есиль",KZ:"Есіл өзені",EN:"Esil River"},coordinates:[71.4522,51.1599],status:"normal",temperature:14.5,ph:7.4,turbidity:7.2,oxygen:7.4,conductivity:404,updated:{RU:"9 минут назад",KZ:"9 минут бұрын",EN:"9 minutes ago"}},
  {id:"nura-01",name:{RU:"Контрольный створ Нура",KZ:"Нұра бақылау тұстамасы",EN:"Nura Control Section"},waterBody:{RU:"Река Нура",KZ:"Нұра өзені",EN:"Nura River"},coordinates:[71.0748,50.9636],status:"offline",temperature:13.6,ph:7.5,turbidity:6.9,oxygen:7.5,conductivity:389,updated:{RU:"3 часа назад",KZ:"3 сағат бұрын",EN:"3 hours ago"}},
  {id:"korgalzhyn-01",name:{RU:"Озеро Коргалжын",KZ:"Қорғалжын көлі",EN:"Lake Korgalzhyn"},waterBody:{RU:"Коргалжынская система озёр",KZ:"Қорғалжын көлдер жүйесі",EN:"Korgalzhyn Lake System"},coordinates:[69.185,50.58],status:"normal",temperature:12.9,ph:7.8,turbidity:5.6,oxygen:7.8,conductivity:376,updated:{RU:"18 минут назад",KZ:"18 минут бұрын",EN:"18 minutes ago"}},
];

const colors:Record<StationStatus,string>={normal:"#34d399",attention:"#fbbf24",risk:"#f87171",offline:"#94a3b8"};
const loc=(language:Language,ru:string,kz:string,en:string)=>language==="RU"?ru:language==="KZ"?kz:en;
const tileAt=(longitude:number,latitude:number,zoom:number)=>{
  const scale=2**zoom;const lat=latitude*Math.PI/180;
  return [Math.floor((longitude+180)/360*scale),Math.floor((1-Math.asinh(Math.tan(lat))/Math.PI)/2*scale)];
};

export default function RealWaterMap({language,stations=waterStations,selectedId,onSelect,className=""}:{language:Language;stations?:WaterStation[];selectedId?:string;onSelect:(station:WaterStation)=>void;className?:string}){
  const container=useRef<HTMLDivElement>(null);
  const mapRef=useRef<MapLibreMap|null>(null);
  const markersRef=useRef<MapLibreMarker[]>([]);
  const userMarkerRef=useRef<MapLibreMarker|null>(null);
  const searchMarkerRef=useRef<MapLibreMarker|null>(null);
  const [error,setError]=useState(false);
  const [mapReady,setMapReady]=useState(false);
  const [tilesReady,setTilesReady]=useState(false);
  const [tilesFailed,setTilesFailed]=useState(false);
  const [view,setView]=useState<"diagram"|"live">("diagram");
  const [satellite,setSatellite]=useState(false);
  const [world,setWorld]=useState(false);
  const [query,setQuery]=useState("");
  const [searching,setSearching]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{let cancelled=false;void import("maplibre-gl").then(({Map,NavigationControl})=>{
    if(cancelled||!container.current||mapRef.current)return;
    try{
      const map=new Map({container:container.current,center:[71.42,51.15],zoom:11.3,style:{version:8,sources:{
        overview:{type:"image",url:"/map-fallback.svg",coordinates:[[71.35,51.19],[71.50,51.19],[71.50,51.11],[71.35,51.11]]},
        osm:{type:"raster",tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],tileSize:256,attribution:"© OpenStreetMap contributors"},
        satellite:{type:"raster",tiles:["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],tileSize:256,attribution:"© Esri"},
      },layers:[{id:"overview",type:"raster",source:"overview"},{id:"osm",type:"raster",source:"osm"},{id:"satellite",type:"raster",source:"satellite",layout:{visibility:"none"}}]}});
      map.addControl(new NavigationControl({showCompass:true}),"bottom-right");mapRef.current=map;
      // Markers can be attached before remote raster tiles finish (or fail) loading.
      setMapReady(true);
    }catch{setError(true)}
  }).catch(()=>setError(true));return()=>{cancelled=true;markersRef.current.forEach(m=>m.remove());userMarkerRef.current?.remove();searchMarkerRef.current?.remove();mapRef.current?.remove();mapRef.current=null}},[]);

  useEffect(()=>{const map=mapRef.current;if(!map)return;const update=()=>{if(!map.getLayer("osm")||!map.getLayer("satellite"))return;const osm=satellite?"none":"visible";const imagery=satellite?"visible":"none";if(map.getLayoutProperty("osm","visibility")!==osm)map.setLayoutProperty("osm","visibility",osm);if(map.getLayoutProperty("satellite","visibility")!==imagery)map.setLayoutProperty("satellite","visibility",imagery)};map.on("styledata",update);update();return()=>{map.off("styledata",update)}},[satellite,mapReady]);

  useEffect(()=>{
    if(!mapReady||!mapRef.current)return;
    let cancelled=false;const map=mapRef.current;const image=new Image();const [x,y]=tileAt(71.42,51.15,11);
    const url=satellite?`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/11/${y}/${x}`:`https://tile.openstreetmap.org/11/${x}/${y}.png`;
    const timeout=window.setTimeout(()=>{if(!cancelled)setTilesFailed(true)},12000);
    const reveal=()=>{if(!cancelled&&map.isStyleLoaded()&&map.isSourceLoaded(satellite?"satellite":"osm")){setTilesReady(true);setTilesFailed(false);map.off("idle",reveal);window.clearTimeout(timeout)}};
    image.onload=()=>{if(!cancelled){map.on("idle",reveal);reveal()}};
    image.onerror=()=>{if(!cancelled)setTilesFailed(true);window.clearTimeout(timeout)};
    image.src=url;
    return()=>{cancelled=true;image.onload=null;image.onerror=null;map.off("idle",reveal);window.clearTimeout(timeout)};
  },[satellite,mapReady]);

  useEffect(()=>{let disposed=false;void import("maplibre-gl").then(({Marker,LngLatBounds})=>{
    if(disposed||!mapRef.current)return;markersRef.current.forEach(m=>m.remove());markersRef.current=stations.map(station=>{const el=document.createElement("button");el.className="rp-map-marker status-"+station.status+(selectedId===station.id?" is-selected":"");el.type="button";el.setAttribute("aria-label",station.waterBody[language]+" — "+station.name[language]);el.style.setProperty("--marker-color",colors[station.status]);el.addEventListener("click",()=>onSelect(station));return new Marker({element:el,anchor:"center"}).setLngLat(station.coordinates).addTo(mapRef.current!)});
    if(stations.length>0&&stations.length<waterStations.length){const bounds=new LngLatBounds(stations[0].coordinates,stations[0].coordinates);stations.slice(1).forEach(s=>bounds.extend(s.coordinates));mapRef.current.fitBounds(bounds,{padding:90,maxZoom:12,duration:500})}
  });return()=>{disposed=true}},[mapReady,stations,selectedId,language,onSelect]);

  async function searchPlace(event:FormEvent){event.preventDefault();if(!query.trim())return;const match=waterStations.find(s=>(s.name[language]+" "+s.waterBody[language]).toLowerCase().includes(query.toLowerCase()));if(match){onSelect(match);mapRef.current?.flyTo({center:match.coordinates,zoom:12,duration:700});setMessage(match.waterBody[language]+" · "+match.name[language]);return}if(!mapRef.current){setMessage(t(language,"map.fallback"));return}setSearching(true);setMessage("");try{
    const response=await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1${world?"":"&countrycodes=kz"}&q=${encodeURIComponent(query)}`,{headers:{"Accept-Language":language==="KZ"?"kk":language.toLowerCase()}});
    const results=await response.json() as Array<{lat:string;lon:string;display_name:string}>;if(!results[0]){setMessage(loc(language,"Место не найдено","Орын табылмады","Place not found"));return}
    const point:[number,number]=[Number(results[0].lon),Number(results[0].lat)];const {Marker}=await import("maplibre-gl");searchMarkerRef.current?.remove();const el=document.createElement("span");el.className="rp-location-marker search";searchMarkerRef.current=new Marker({element:el}).setLngLat(point).addTo(mapRef.current);mapRef.current.flyTo({center:point,zoom:13,duration:900});setMessage(results[0].display_name);
  }catch{setMessage(loc(language,"Ошибка поиска","Іздеу қатесі","Search error"))}finally{setSearching(false)}}

  function locate(){if(!navigator.geolocation||!mapRef.current)return;setMessage(loc(language,"Определяем местоположение…","Орналасқан жер анықталуда…","Locating…"));navigator.geolocation.getCurrentPosition(async position=>{const point:[number,number]=[position.coords.longitude,position.coords.latitude];const {Marker}=await import("maplibre-gl");userMarkerRef.current?.remove();const el=document.createElement("span");el.className="rp-location-marker";userMarkerRef.current=new Marker({element:el}).setLngLat(point).addTo(mapRef.current!);mapRef.current?.flyTo({center:point,zoom:14,duration:900});setMessage(loc(language,"Ваше местоположение","Сіздің орналасқан жеріңіз","Your location"))},()=>setMessage(loc(language,"Доступ к геолокации не разрешён","Геолокацияға рұқсат берілмеді","Location permission was not granted")),{enableHighAccuracy:true,timeout:8000})}

  const localStations=world?[]:stations.filter(s=>s.coordinates[0]>71.35&&s.coordinates[0]<71.50&&s.coordinates[1]>51.11&&s.coordinates[1]<51.19);
  const selectedStation=waterStations.find(station=>station.id===selectedId)||waterStations[0];
  const googleMapsUrl=`https://www.google.com/maps/search/?api=1&query=${selectedStation.coordinates[1]},${selectedStation.coordinates[0]}`;
  return <div className={"real-map "+className}><div ref={container} className="real-map-canvas"/>
    {(view==="diagram"||!mapReady||!tilesReady||error)&&<div className="rp-map-fallback" role="group" aria-label={t(language,"map.diagram")}><span className="rp-fallback-note">{t(language,tilesFailed||error?"map.offline":tilesReady?"map.diagramNote":"map.fallback")}</span>{localStations.map(station=><button key={station.id} type="button" className={"rp-fallback-pin "+(station.id===selectedId?"selected":"")} style={{left:((station.coordinates[0]-71.35)/.15*100)+"%",top:((51.19-station.coordinates[1])/.08*100)+"%","--marker-color":colors[station.status]} as CSSProperties} onClick={()=>onSelect(station)} aria-label={station.waterBody[language]+" — "+station.name[language]} title={station.name[language]}/>)}{localStations.length===0&&<div className="rp-fallback-empty"><b>{t(language,"map.regionalFallback")}</b>{stations.map(station=><button type="button" key={station.id} onClick={()=>onSelect(station)}>{station.name[language]} <small>{station.coordinates[1].toFixed(3)}, {station.coordinates[0].toFixed(3)}</small></button>)}</div>}</div>}
    <form className="rp-map-geosearch" onSubmit={searchPlace}><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={world?loc(language,"Найти место в мире","Әлемнен орын іздеу","Find a place worldwide"):loc(language,"Найти место в Казахстане","Қазақстаннан орын іздеу","Find a place in Kazakhstan")} aria-label={loc(language,"Поиск места","Орын іздеу","Search place")}/><button type="submit" disabled={searching} aria-label={loc(language,"Искать","Іздеу","Search")}>{searching?"…":"↵"}</button></form>
    <div className="rp-map-controls"><button type="button" onClick={locate} title={loc(language,"Моё местоположение","Менің орналасқан жерім","My location")} aria-label={loc(language,"Моё местоположение","Менің орналасқан жерім","My location")}><LocateFixed size={18}/></button><button type="button" className={satellite?"active":""} aria-pressed={satellite} onClick={()=>{setTilesReady(false);setTilesFailed(false);setSatellite(v=>!v)}} title={loc(language,"Спутниковый слой","Спутниктік қабат","Satellite layer")} aria-label={loc(language,"Спутниковый слой","Спутниктік қабат","Satellite layer")}><Layers3 size={18}/></button><button type="button" className={world?"active":""} aria-pressed={world} onClick={()=>{const next=!world;setWorld(next);mapRef.current?.flyTo({center:next?[68,45]:[71.42,51.15],zoom:next?2.5:11.3,duration:700})}} title={loc(language,"Мир / Астана","Әлем / Астана","World / Astana")} aria-label={loc(language,"Мир / Астана","Әлем / Астана","World / Astana")}><Globe2 size={18}/></button></div>
    <div className="rp-map-view" role="group" aria-label={t(language,"map.layers")}><button type="button" className={view==="diagram"?"active":""} aria-pressed={view==="diagram"} onClick={()=>setView("diagram")}>{t(language,"map.diagram")}</button><button type="button" className={view==="live"?"active":""} aria-pressed={view==="live"} onClick={()=>setView("live")} disabled={!tilesReady||error}>{t(language,"map.live")}</button></div>
    <a className="rp-google-map-link" href={googleMapsUrl} target="_blank" rel="noopener noreferrer" aria-label={t(language,"map.google")+" — "+selectedStation.name[language]}><ExternalLink size={15}/>{t(language,"map.google")}</a>
    {message&&<div className="rp-map-message" role="status">{message}</div>}<div className="map-attribution-note">{t(language,"common.demo")} · {satellite?"Esri":"OpenStreetMap"}</div></div>
}
