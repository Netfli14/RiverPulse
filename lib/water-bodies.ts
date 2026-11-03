import type { Language } from "./riverpulse-i18n";

export type WaterBodyId = "esil" | "sarykol";
export type WaterBody = {
  id: WaterBodyId;
  name: Record<Language, string>;
  location: Record<Language, string>;
  coordinates: { lat: number; lng: number };
  robotId: "rc-01" | null;
};

export const waterBodies: readonly WaterBody[] = [
  {
    id: "esil",
    name: { RU: "Ишим (Есиль)", KZ: "Есіл", EN: "Ishim (Esil)" },
    location: { RU: "Астана", KZ: "Астана", EN: "Astana" },
    coordinates: { lat: 51.1555, lng: 71.4264 },
    robotId: "rc-01",
  },
  {
    id: "sarykol",
    name: { RU: "Сарыколь", KZ: "Сарыкөл", EN: "Sarykol" },
    location: { RU: "Рядом с Сырдарьёй · точка команды", KZ: "Сырдария маңы · команда нүктесі", EN: "Near Syr Darya · team-specified location" },
    coordinates: { lat: 42.53565, lng: 68.288398 },
    robotId: null,
  },
];

export const waterMetrics = [
  { key: "waterTemperature", label: { RU: "Температура", KZ: "Температура", EN: "Temperature" }, unit: "°C", decimals: 1 },
  { key: "ph", label: { RU: "pH", KZ: "pH", EN: "pH" }, unit: "", decimals: 2 },
  { key: "turbidity", label: { RU: "Мутность", KZ: "Лайлылық", EN: "Turbidity" }, unit: "NTU", decimals: 1 },
  { key: "oxygen", label: { RU: "Растворённый кислород", KZ: "Еріген оттегі", EN: "Dissolved oxygen" }, unit: "mg/L", decimals: 1 },
  { key: "conductivity", label: { RU: "Электропроводность", KZ: "Электрөткізгіштік", EN: "Conductivity" }, unit: "µS/cm", decimals: 0 },
] as const;
export type WaterMetricKey = typeof waterMetrics[number]["key"];
export type ExampleReading = Record<WaterMetricKey, number> & {
  date: string;
  source: "synthetic_example";
};

// Fixed, explicitly synthetic scenarios. Never insert these into robot telemetry
// or a persistent measurements collection; they are not field-test evidence.
const dates = ["2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03"];
const rows = (values: number[][]): ExampleReading[] => values.map(([waterTemperature, ph, turbidity, oxygen, conductivity], index) => ({
  date: dates[index], source: "synthetic_example", waterTemperature, ph, turbidity, oxygen, conductivity,
}));
export const exampleWeeks: Record<WaterBodyId, readonly ExampleReading[]> = {
  esil: rows([
    [8.4, 7.62, 12.4, 9.1, 482], [8.1, 7.58, 13.1, 9.3, 487],
    [7.8, 7.65, 11.8, 9.4, 479], [7.6, 7.61, 14.2, 9.2, 494],
    [7.3, 7.56, 13.6, 9.6, 489], [7.1, 7.60, 12.1, 9.7, 483],
    [6.9, 7.63, 11.5, 9.8, 478],
  ]),
  sarykol: rows([
    [13.8, 7.84, 26.1, 7.8, 912], [13.5, 7.80, 28.4, 7.6, 925],
    [13.1, 7.87, 24.8, 8.0, 906], [12.9, 7.82, 30.2, 7.7, 938],
    [12.6, 7.78, 27.5, 8.1, 921], [12.3, 7.83, 25.3, 8.2, 914],
    [12.0, 7.85, 23.9, 8.3, 902],
  ]),
};

export function getWaterBody(id: string) {
  return waterBodies.find(body => body.id === id);
}

// A GPS packet from RC-01 belongs to Ishim, never to the Sarykol point.
export function waterPosition(body: WaterBody, gps?: { lat: number; lng: number } | null) {
  return body.robotId === "rc-01" && gps ? gps : body.coordinates;
}

export function exampleWeekCSV(body: WaterBody) {
  const header = "data_type,water_body_id,date,latitude,longitude,water_temperature_c,ph,turbidity_ntu,dissolved_oxygen_mg_l,conductivity_us_cm";
  return [header, ...exampleWeeks[body.id].map(row => [row.source, body.id, row.date, body.coordinates.lat, body.coordinates.lng,
    row.waterTemperature, row.ph, row.turbidity, row.oxygen, row.conductivity].join(","))].join("\n");
}
