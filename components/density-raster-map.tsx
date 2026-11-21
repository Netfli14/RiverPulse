"use client";

import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import { Crosshair, Minus, Plus } from "lucide-react";
import type { Language } from "@/lib/riverpulse-i18n";
import { densityField, densityRGB, mapCoordinate, mapPixel, type DensityScenario } from "@/lib/waste-density";

const text = (l: Language, ru: string, kz: string, en: string) => l === "RU" ? ru : l === "KZ" ? kz : en;

/** A working map for browsers without WebGL2: the same geographic projection,
 * raster cartography, keyboard/pointer panning and bounded zoom. */
export default function DensityRasterMap({ scenario, showDensity, language }: { scenario: DensityScenario; showDensity: boolean; language: Language }) {
  const host = useRef<HTMLDivElement>(null), pane = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ pointer: number; x: number; y: number; dx: number; dy: number } | null>(null);
  const [size, setSize] = useState({ width: 700, height: 580 });
  const [view, setView] = useState({ ...scenario.center, zoom: 14 });
  const [tilesLoaded, setTilesLoaded] = useState(false), [tileError, setTileError] = useState(false);
  const center = mapPixel(view.lng, view.lat, view.zoom);
  const left = center.x - size.width / 2, top = center.y - size.height / 2;
  const northwest = mapPixel(scenario.bounds[0], scenario.bounds[3], view.zoom);
  const southeast = mapPixel(scenario.bounds[2], scenario.bounds[1], view.zoom);
  const team = mapPixel(scenario.center.lng, scenario.center.lat, view.zoom);
  const tiles = [];
  const count = 2 ** view.zoom;
  for (let y = Math.max(0, Math.floor(top / 256)); y <= Math.min(count - 1, Math.floor((top + size.height) / 256)); y++) {
    for (let x = Math.floor(left / 256); x <= Math.floor((left + size.width) / 256); x++) {
      const wrapped = ((x % count) + count) % count;
      tiles.push({ id: `${view.zoom}/${wrapped}/${y}`, x: x * 256 - left, y: y * 256 - top });
    }
  }

  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0].contentRect;
      setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const image = canvas.current, ctx = image?.getContext("2d");
    if (!image || !ctx) return;
    const width = 280, height = 190;
    image.width = width; image.height = height;
    const field = densityField(scenario, width, height, 13), pixels = ctx.createImageData(width, height);
    for (let i = 0; i < field.length; i++) {
      const colour = densityRGB(field[i]);
      pixels.data.set([...colour, field[i] < .004 ? 0 : Math.round(Math.min(.94, field[i] * 3) * 255)], i * 4);
    }
    ctx.putImageData(pixels, 0, 0);
  }, [scenario]);

  function pan(dx: number, dy: number) {
    setView(current => {
      const p = mapPixel(current.lng, current.lat, current.zoom);
      return { ...mapCoordinate(p.x - dx, p.y - dy, current.zoom), zoom: current.zoom };
    });
  }
  function zoom(change: number) { setView(current => ({ ...current, zoom: Math.max(10, Math.min(18, current.zoom + change)) })); }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button,a,input,label")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0 };
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.pointer !== event.pointerId || !pane.current) return;
    d.dx = event.clientX - d.x; d.dy = event.clientY - d.y;
    pane.current.style.transform = `translate(${d.dx}px,${d.dy}px)`;
  }
  function pointerEnd(event: PointerEvent<HTMLDivElement>, cancel = false) {
    const d = drag.current;
    if (!d || d.pointer !== event.pointerId) return;
    drag.current = null;
    if (pane.current) pane.current.style.transform = "";
    if (!cancel) pan(d.dx, d.dy);
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button,a,input")) return;
    const direction: Record<string, [number, number]> = { ArrowLeft: [90, 0], ArrowRight: [-90, 0], ArrowUp: [0, 90], ArrowDown: [0, -90] };
    if (direction[event.key]) { event.preventDefault(); pan(...direction[event.key]); }
    else if (["+", "=", "-"].includes(event.key)) { event.preventDefault(); zoom(event.key === "-" ? -1 : 1); }
  }

  return <div ref={host} className="wg-raster-map" tabIndex={0} role="region" aria-label={text(language, "Карта 2D. Стрелки перемещают карту, плюс и минус меняют масштаб.", "2D карта. Көрсеткілер картаны жылжытады, плюс пен минус масштабты өзгертеді.", "2D map. Arrow keys pan; plus and minus zoom.")} onKeyDown={keyboard} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={event => pointerEnd(event, true)}>
    <div ref={pane} className="wg-raster-pane" aria-hidden="true">
      {tiles.map(tile => <img className="wg-raster-tile" key={tile.id} src={`https://tile.openstreetmap.org/${tile.id}.png`} alt="" width={256} height={256} draggable={false} onLoad={() => setTilesLoaded(true)} onError={() => setTileError(true)} style={{ transform: `translate(${tile.x}px,${tile.y}px)` }} />)}
      <canvas ref={canvas} className="wg-raster-heat" style={{ left: northwest.x - left, top: northwest.y - top, width: southeast.x - northwest.x, height: southeast.y - northwest.y, opacity: showDensity ? 1 : 0 }} />
      <span className="wg-raster-marker" style={{ left: team.x - left, top: team.y - top }} />
    </div>
    <div className="wg-raster-controls">
      <button type="button" onClick={() => zoom(1)} disabled={view.zoom === 18} aria-label={text(language, "Приблизить", "Үлкейту", "Zoom in")}><Plus size={20} aria-hidden="true" /></button>
      <button type="button" onClick={() => zoom(-1)} disabled={view.zoom === 10} aria-label={text(language, "Отдалить", "Кішірейту", "Zoom out")}><Minus size={20} aria-hidden="true" /></button>
      <button type="button" onClick={() => setView({ ...scenario.center, zoom: 14 })} aria-label={text(language, "Вернуться к точке команды", "Команда нүктесіне оралу", "Return to the team location")}><Crosshair size={19} aria-hidden="true" /></button>
    </div>
    <span className="wg-raster-zoom">{text(language, "Масштаб", "Масштаб", "Zoom")} {view.zoom}</span>
    {tileError && !tilesLoaded && <p className="wg-density-status" role="status">{text(language, "Подложка недоступна. Плотность показана как демо-схема с сохранением координат.", "Карта негізі қолжетімсіз. Тығыздық координаталары сақталған демо-сызбада көрсетілген.", "Basemap unavailable. The georeferenced demo density remains visible.")}</p>}
  </div>;
}
