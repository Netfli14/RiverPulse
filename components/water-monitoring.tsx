"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowUpRight, Download, FlaskConical, MapPin, Radio, Search } from "lucide-react";
import { AppLink as Link } from "@/components/app-link";
import RealWaterMap, { waterStations } from "@/components/real-water-map";
import { useRobot } from "@/components/robot-provider";
import { exampleWeekCSV, exampleWeeks, getWaterBody, waterBodies, waterMetrics, waterPosition, type WaterBody, type WaterBodyId, type WaterMetricKey } from "@/lib/water-bodies";
import type { Language } from "@/lib/riverpulse-i18n";

const text = (language: Language, ru: string, kz: string, en: string) => language === "RU" ? ru : language === "KZ" ? kz : en;
const locale = (language: Language) => language === "RU" ? "ru-RU" : language === "KZ" ? "kk-KZ" : "en-GB";
const day = (date: string, language: Language) => new Intl.DateTimeFormat(locale(language), { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(date + "T12:00:00Z"));
const WeeklyWaterChart = dynamic(() => import("@/components/weekly-water-chart"), { ssr: false });

function RiverLinks({ language, selected }: { language: Language; selected: WaterBodyId }) {
  return <nav className="wg-river-links" aria-label={text(language, "Выбрать реку", "Өзенді таңдау", "Choose a river")}>
    {waterBodies.map(body => <Link key={body.id} href={`/water/${body.id}`} aria-current={selected === body.id ? "page" : undefined} className={"rp-button secondary " + (selected === body.id ? "selected" : "")}><MapPin size={16} />{body.name[language]}</Link>)}
  </nav>;
}

export function WeeklyExample({ language, body }: { language: Language; body: WaterBody }) {
  const [metricKey, setMetricKey] = useState<WaterMetricKey>("turbidity");
  const metric = waterMetrics.find(item => item.key === metricKey)!;
  const readings = exampleWeeks[body.id];
  const data = readings.map(row => ({ ...row, label: day(row.date, language) }));
  function download() {
    const url = URL.createObjectURL(new Blob([exampleWeekCSV(body)], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `waterguard-${body.id}-DEMO-2026-10-28_2026-11-03.csv`; anchor.click(); URL.revokeObjectURL(url);
  }
  return <section className="wg-week" aria-label={text(language, "Демонстрационная неделя", "Демонстрациялық апта", "Demonstration week")}>
    <div className="wg-week-heading"><div><span className="wg-demo-badge"><FlaskConical size={14} />{text(language, "ДЕМОНСТРАЦИОННЫЕ ДАННЫЕ", "ДЕМОНСТРАЦИЯЛЫҚ ДЕРЕКТЕР", "DEMONSTRATION DATA")}</span><h2>{text(language, "Неделя в цифрах", "Апта көрсеткіштері", "A week in numbers")}</h2><p>{body.name[language]} · {day(readings[0].date, language)} – {day(readings[6].date, language)} 2026 · {text(language, "7 дневных примеров", "7 күндік мысал", "7 daily examples")}</p></div><button type="button" className="rp-button secondary" onClick={download}><Download size={16} />{text(language, "CSV · демо", "CSV · демо", "CSV · demo")}</button></div>
    <p className="wg-demo-notice"><FlaskConical size={19} /><span>{text(language,
      "Примерные значения для демонстрации платформы. Это не результаты полевых измерений и не подтверждение испытаний робота.",
      "Платформаны көрсетуге арналған мысал мәндер. Бұлар далалық өлшемдер де, робот сынағының дәлелі де емес.",
      "Illustrative values for demonstrating the platform. These are not field measurements or evidence of robot trials.")}</span></p>
    <div className="wg-week-metrics">{waterMetrics.map(item => {
      const values = readings.map(row => row[item.key]);
      const average = values.reduce((sum, n) => sum + n, 0) / values.length;
      return <article key={item.key} className="rp-card rp-metric"><span>{item.label[language]}</span><strong>{average.toFixed(item.decimals)} <small>{item.unit}</small></strong><small>{text(language, "Среднее · пример", "Орташа · мысал", "Average · example")}<br />{Math.min(...values).toFixed(item.decimals)}–{Math.max(...values).toFixed(item.decimals)} {item.unit}</small></article>;
    })}</div>
    <section className="rp-card rp-panel wg-week-chart"><div className="wg-chart-heading"><div><span className="rp-kicker">{text(language, "ДЕМО · 7 ДНЕЙ", "ДЕМО · 7 КҮН", "DEMO · 7 DAYS")}</span><h3>{metric.label[language]}{metric.unit ? `, ${metric.unit}` : ""}</h3></div><label>{text(language, "Показатель", "Көрсеткіш", "Parameter")}<select value={metricKey} onChange={event => setMetricKey(event.target.value as WaterMetricKey)}>{waterMetrics.map(item => <option key={item.key} value={item.key}>{item.label[language]}</option>)}</select></label></div><div className="wg-chart-canvas" role="img" aria-label={`${body.name[language]} · ${metric.label[language]} · ${text(language, "пример за 7 дней; все значения в таблице ниже", "7 күндік мысал; барлық мәндер төмендегі кестеде", "7-day example; all values in the table below")}`}>
      <WeeklyWaterChart data={data} metricKey={metric.key} name={text(language, "Демо · ", "Демо · ", "Demo · ") + metric.label[language]} unit={metric.unit} />
    </div></section>
    <section className="rp-card rp-panel wg-week-table"><h3>{text(language, "Дневные значения · демо", "Күнделікті мәндер · демо", "Daily values · demo")}</h3><div className="rp-table-wrap"><table><caption className="sr-only">{text(language, "Примерные данные, не полевые измерения", "Мысал деректер, далалық өлшем емес", "Illustrative data, not field measurements")} · {body.name[language]}</caption><thead><tr><th>{text(language, "Дата", "Күні", "Date")}</th>{waterMetrics.map(item => <th key={item.key}>{item.label[language]}{item.unit && <small>{item.unit}</small>}</th>)}</tr></thead><tbody>{readings.map(row => <tr key={row.date}><td><time dateTime={row.date}>{day(row.date, language)}</time></td>{waterMetrics.map(item => <td key={item.key}>{row[item.key].toFixed(item.decimals)}</td>)}</tr>)}</tbody></table></div></section>
  </section>;
}

function LiveReadings({ language, body }: { language: Language; body: WaterBody }) {
  const robot = useRobot();
  const reading = body.robotId ? robot.reading : null;
  return <section className="rp-card rp-panel wg-live-readings"><div className="wg-chart-heading"><div><span className="rp-kicker"><Radio size={14} />{text(language, "ПОКАЗАНИЯ ОБОРУДОВАНИЯ", "ЖАБДЫҚ КӨРСЕТКІШТЕРІ", "HARDWARE READINGS")}</span><h2>{body.robotId ? "ESP32 · RC-01" : text(language, "Датчик ещё не подключён", "Датчик әлі қосылмаған", "No sensor connected yet")}</h2></div>{body.robotId && <Link href="/robots/rc-01" className="rp-text-link">{text(language, "Робот", "Робот", "Robot")}<ArrowUpRight size={16} /></Link>}</div><p>{reading ? `${reading.source.toUpperCase()} · ${new Date(reading.receivedAt).toLocaleString(locale(language))} · ${text(language, robot.fresh ? "данные поступают" : "последние полученные данные", robot.fresh ? "деректер келуде" : "соңғы алынған деректер", robot.fresh ? "receiving data" : "last received readings")}` : text(language, body.robotId ? "Ожидаем пакет ESP32 с Ишима. Реальные данные появятся здесь отдельно от примера выше." : "К Сарыколю пока не привязан робот. Координаты точки указаны командой; реальные измерения ещё не загружены.", body.robotId ? "Есілден ESP32 пакетін күтеміз. Нақты деректер жоғарыдағы мысалдан бөлек осында пайда болады." : "Сарыкөлге робот әлі бекітілмеген. Нүкте координаталарын команда берді; нақты өлшемдер әлі жүктелмеген.", body.robotId ? "Waiting for an ESP32 packet from Ishim. Real readings will appear here, separately from the example above." : "No robot is assigned to Sarykol yet. The team supplied the coordinates; real measurements have not been uploaded.")}</p>{body.robotId && <div className="wg-live-grid">{waterMetrics.map(metric => <div key={metric.key}><span>{metric.label[language]}</span><b>{typeof reading?.[metric.key] === "number" ? `${reading[metric.key]} ${metric.unit}` : "—"}</b></div>)}</div>}</section>;
}

export function WaterBodyPage({ language, id }: { language: Language; id: string }) {
  const body = getWaterBody(id);
  if (!body) return null;
  const stations = waterStations.filter(station => station.bodyId === body.id);
  return <main className="rp-content wg-water-page"><div className="rp-page-title"><div><span className="rp-kicker">WATER GUARD / {body.id.toUpperCase()}</span><h1>{body.name[language]}</h1><p>{body.location[language]} · {body.coordinates.lat.toFixed(6)}, {body.coordinates.lng.toFixed(6)}</p></div></div><RiverLinks language={language} selected={body.id} /><WeeklyExample language={language} body={body} /><div className="rp-water-bottom"><RealWaterMap language={language} stations={stations} /><LiveReadings language={language} body={body} /></div></main>;
}

export function WeeklyAnalytics({ language }: { language: Language }) {
  const [id, setId] = useState<WaterBodyId>("esil");
  const body = getWaterBody(id)!;
  return <div className="wg-weekly-analytics"><label className="wg-river-select">{text(language, "Река для недельного примера", "Апталық мысалға арналған өзен", "River for the weekly example")}<select value={id} onChange={event => setId(event.target.value as WaterBodyId)}>{waterBodies.map(item => <option key={item.id} value={item.id}>{item.name[language]}</option>)}</select></label><WeeklyExample language={language} body={body} /></div>;
}

export function RiverMapPage({ language }: { language: Language }) {
  const [selectedId, setSelectedId] = useState<WaterBodyId>("esil");
  const [query, setQuery] = useState("");
  const [onlyLive, setOnlyLive] = useState(false);
  const robot = useRobot();
  const visible = waterBodies.filter(body => {
    const search = `${body.id} ${Object.values(body.name).join(" ")} ${Object.values(body.location).join(" ")} ${body.robotId || ""}`.toLowerCase();
    return search.includes(query.trim().toLowerCase()) && (!onlyLive || body.robotId && robot.fresh);
  });
  const body = visible.find(item => item.id === selectedId) || visible[0];
  const position = body ? waterPosition(body, robot.reading?.gps) : null;
  return <main className="rp-map-page"><div className="rp-map-toolbar"><div><h1>{text(language, "Две реки. Одна платформа.", "Екі өзен. Бір платформа.", "Two rivers. One platform.")}</h1><p>{text(language, "Ишим и Сарыколь · точки команды и недельные примеры", "Есіл және Сарыкөл · команда нүктелері және апталық мысалдар", "Ishim and Sarykol · team locations and weekly examples")}</p></div></div><div className="rp-map-layout"><aside className="rp-card rp-map-filters wg-river-filters"><label className="rp-search"><Search size={17} /><input aria-label={text(language, "Найти реку", "Өзенді табу", "Find a river")} placeholder={text(language, "Ишим / Сарыколь", "Есіл / Сарыкөл", "Ishim / Sarykol")} value={query} onChange={event => setQuery(event.target.value)} /></label><label className="wg-live-filter"><input type="checkbox" checked={onlyLive} onChange={event => setOnlyLive(event.target.checked)} />{text(language, "Только с живыми данными", "Тек нақты уақыт деректері", "Live data only")}</label><p>{text(language, "Водоёмов", "Су айдындары", "Water bodies")}: {visible.length} · {text(language, "Роботов", "Роботтар", "Robots")}: {visible.filter(item => item.robotId).length}</p><div className="wg-river-list">{visible.map(item => <button type="button" key={item.id} className={body?.id === item.id ? "active" : ""} aria-pressed={body?.id === item.id} onClick={() => setSelectedId(item.id)}><MapPin size={17} /><span><b>{item.name[language]}</b><small>{item.robotId ? "RC-01 · " : ""}{text(language, "7 дней · демо", "7 күн · демо", "7 days · demo")}</small></span></button>)}</div></aside>{body ? <RealWaterMap language={language} className="rp-main-map" stations={waterStations.filter(station => station.bodyId === body.id)} /> : <section className="rp-card rp-panel"><h2>{text(language, "Ничего не найдено", "Ештеңе табылмады", "No matching rivers")}</h2><button type="button" className="rp-button secondary" onClick={() => { setQuery(""); setOnlyLive(false); }}>{text(language, "Сбросить фильтры", "Сүзгілерді тазалау", "Reset filters")}</button></section>}{body && position && <aside className="rp-card rp-station-panel wg-river-panel"><span className="rp-kicker">{body.robotId ? "RIVERCLEANER RC-01" : text(language, "ТОЧКА КОМАНДЫ", "КОМАНДА НҮКТЕСІ", "TEAM LOCATION")}</span><h2>{body.name[language]}</h2><p>{body.location[language]}</p><div className="rp-coordinates"><MapPin size={16} />{position.lat.toFixed(6)}, {position.lng.toFixed(6)}</div><p>{body.robotId && robot.reading?.gps ? text(language, "Последний GPS робота.", "Роботтың соңғы GPS орны.", "Latest robot GPS.") : text(language, "Координаты заданы командой. GPS-подтверждение отсутствует.", "Координаталарды команда берді. GPS растауы жоқ.", "Coordinates supplied by the team. No GPS confirmation.")}</p><span className="wg-demo-badge">{text(language, "Неделя · демонстрация", "Апта · демонстрация", "Week · demonstration")}</span><p>{text(language, "7 дневных примеров параметров воды. Реальные данные оборудования показаны отдельно.", "Су параметрлерінің 7 күндік мысалы. Нақты жабдық деректері бөлек көрсетіледі.", "7 daily examples of water parameters. Hardware readings are shown separately.")}</p><Link href={`/water/${body.id}`} className="rp-button primary full">{text(language, "Открыть неделю", "Аптаны ашу", "View week")}<ArrowUpRight size={16} /></Link></aside>}</div></main>;
}
