"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, ExternalLink, Layers, MapPin } from "lucide-react";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import type { Language } from "@/lib/riverpulse-i18n";
import type { WaterBody } from "@/lib/water-bodies";
import { densityColours, densityField, densityGeoJSON, densityRGB, densityScenario, type DensityScenario } from "@/lib/waste-density";
import DensityRasterMap from "@/components/density-raster-map";

const text = (l: Language, ru: string, kz: string, en: string) => l === "RU" ? ru : l === "KZ" ? kz : en;

function DensityFallback({ scenario, visible }: { scenario: DensityScenario; visible: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const width = 280, height = 190;
    canvas.width = width; canvas.height = height;
    const field = densityField(scenario, width, height, 13);
    const image = ctx.createImageData(width, height);
    for (let i = 0; i < field.length; i++) {
      const colour = densityRGB(field[i]);
      image.data.set([...colour, 255], i * 4);
    }
    ctx.putImageData(image, 0, 0);
  }, [scenario]);
  return <canvas ref={ref} className="wg-density-fallback" aria-hidden="true" style={{ opacity: visible ? 1 : 0 }} />;
}

export default function WasteDensityMap({ language, body }: { language: Language; body: WaterBody }) {
  const scenario = useMemo(() => densityScenario(body), [body]);
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [showDensity, setShowDensity] = useState(true);

  useEffect(() => {
    let alive = true, basemapFailed = false, local: MapLibreMap | undefined;
    setReady(false); setFallback(false);
    const timer = window.setTimeout(() => { if (alive) setFallback(true); }, 12000);
    async function initialise() {
      try {
        const lib = await import("maplibre-gl");
        if (!alive || !host.current) return;
        const style: StyleSpecification = {
          version: 8,
          sources: {
            basemap: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19,
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' },
            density: { type: "geojson", data: densityGeoJSON(scenario) },
            location: { type: "geojson", data: { type: "FeatureCollection", features: [{ type: "Feature", properties: {},
              geometry: { type: "Point", coordinates: [body.coordinates.lng, body.coordinates.lat] } }] } },
          },
          layers: [
            { id: "background", type: "background", paint: { "background-color": densityColours[0] } },
            { id: "basemap", type: "raster", source: "basemap", paint: { "raster-saturation": -1, "raster-brightness-max": .32, "raster-opacity": .7 } },
            { id: "waste-density", type: "heatmap", source: "density", paint: {
              "heatmap-weight": ["get", "weight"], "heatmap-intensity": .32,
              "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 14, 14, 42, 18, 100],
              "heatmap-opacity": .9,
              "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"],
                0, "rgba(3,4,42,0)", .07, densityColours[1], .22, densityColours[2], .4, densityColours[3], .6, densityColours[4], .78, densityColours[5], 1, densityColours[6]],
            } },
            { id: "team-location-ring", type: "circle", source: "location", paint: { "circle-radius": 8, "circle-color": "#102F38", "circle-stroke-color": "#F4F5EF", "circle-stroke-width": 2 } },
            { id: "team-location", type: "circle", source: "location", paint: { "circle-radius": 3, "circle-color": "#F0764F" } },
          ],
        };
        local = new lib.Map({ container: host.current, style, center: [body.coordinates.lng, body.coordinates.lat], zoom: 13.6,
          minZoom: 10, maxZoom: 18, attributionControl: false, dragRotate: false, pitchWithRotate: false, scrollZoom: false });
        map.current = local;
        local.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
        local.on("load", () => {
          if (!alive) return;
          window.clearTimeout(timer); setReady(true); setFallback(basemapFailed);
        });
        local.on("error", event => {
          if (!alive) return;
          // Tile availability is optional; the local scientific layer stays usable.
          if ("sourceId" in event && event.sourceId === "basemap") { basemapFailed = true; setFallback(true); }
        });
        local.getCanvas().addEventListener("webglcontextlost", () => { if (alive) { setReady(false); setFallback(true); } });
      } catch {
        // Missing WebGL2 is a supported capability path, not an app failure.
        if (alive) { window.clearTimeout(timer); setFallback(true); }
      }
    }
    void initialise();
    return () => { alive = false; window.clearTimeout(timer); local?.remove(); if (map.current === local) map.current = null; };
  }, [body, scenario]);

  useEffect(() => {
    if (ready && map.current?.getLayer("waste-density")) map.current.setLayoutProperty("waste-density", "visibility", showDensity ? "visible" : "none");
  }, [ready, showDensity]);

  const googleURL = `https://www.google.com/maps/search/?api=1&query=${body.coordinates.lat},${body.coordinates.lng}`;
  return <section className="wg-density-map" aria-label={text(language, `Плотность мусора: ${body.name.RU}`, `Қоқыс тығыздығы: ${body.name.KZ}`, `Waste density: ${body.name.EN}`)}>
    <DensityFallback scenario={scenario} visible={!ready && !fallback && showDensity} />
    <div ref={host} className="wg-density-canvas" style={{ opacity: ready ? 1 : 0 }} />
    {!ready && fallback && <DensityRasterMap scenario={scenario} showDensity={showDensity} language={language} />}
    <div className="wg-density-topline"><span><MapPin size={15} aria-hidden="true" />{body.name[language]}</span><span className="wg-density-demo">{text(language, "ДЕМО-СЦЕНАРИЙ", "ДЕМО-СЦЕНАРИЙ", "DEMO SCENARIO")}</span></div>
    <div className="wg-density-tools">
      <label><input type="checkbox" checked={showDensity} onChange={event => setShowDensity(event.target.checked)} /><Layers size={16} aria-hidden="true" />{text(language, "Слой плотности", "Тығыздық қабаты", "Density layer")}</label>
      {ready && <button type="button" onClick={() => map.current?.jumpTo({ center: [body.coordinates.lng, body.coordinates.lat], zoom: 13.6 })} aria-label={text(language, "Вернуться к точке команды", "Команда нүктесіне оралу", "Return to the team location")}><Crosshair size={19} aria-hidden="true" /></button>}
    </div>
    {!ready && !fallback && <div className="wg-density-anchor" aria-hidden="true"><span /><b>{body.name[language]}</b></div>}
    <div className="wg-density-legend">
      <div><strong>{text(language, "Плотность мусора", "Қоқыс тығыздығы", "Waste density")}</strong><span>{text(language, "Относительный индекс", "Салыстырмалы индекс", "Relative index")}</span></div>
      <div className="wg-density-scale" aria-hidden="true" />
      <div className="wg-density-ticks" aria-hidden="true">{[0, 25, 50, 75, 100].map(n => <span key={n}>{n}</span>)}</div>
      <p>{text(language, "Синий: ниже. Красный: выше. Пример визуализации, не полевые измерения.", "Көк: төмен. Қызыл: жоғары. Көрсетуге арналған мысал, далалық өлшем емес.", "Blue: lower. Red: higher. Illustrative visualisation, not field measurements.")}</p>
    </div>
    <div className="wg-density-map-meta"><span>{body.coordinates.lat.toFixed(6)}, {body.coordinates.lng.toFixed(6)}</span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OSM</a><a href={googleURL} target="_blank" rel="noreferrer">Google Maps<ExternalLink size={13} aria-hidden="true" /></a></div>
    {fallback && ready && <p className="wg-density-status" role="status">{text(language, "Картографическая подложка недоступна. Показана схема демо-сценария.", "Карта негізі қолжетімсіз. Демо-сценарий сызбасы көрсетілді.", "Basemap unavailable. Showing the demo scenario schematic.")}</p>}
  </section>;
}
