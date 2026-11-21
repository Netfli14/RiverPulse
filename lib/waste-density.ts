import type { WaterBody } from "./water-bodies";

// These colours were measured from the supplied heatmap reference. They are
// reserved for the scientific layer, not the site's brand or status colours.
export const densityColours = ["#03042a", "#0416ea", "#0fbdf0", "#7ced91", "#e9c11e", "#F0764F", "#a10f08"] as const;
export type DensityPoint = { lng: number; lat: number; weight: number; source: "synthetic_example" };
export type DensityScenario = {
  bodyId: WaterBody["id"];
  source: "synthetic_example";
  center: { lng: number; lat: number };
  bounds: [number, number, number, number];
  points: DensityPoint[];
};

/** A fixed, labelled demonstration, isolated from telemetry and stored reports. */
export function densityScenario(body: WaterBody): DensityScenario {
  const { lat, lng } = body.coordinates;
  const longitudeScale = 1 / Math.cos(lat * Math.PI / 180);
  const clusters = [
    { x: -.0040, y: .0022, strength: .36, radius: .0024, count: 24 },
    { x: -.0005, y: .0002, strength: 1, radius: .0030, count: 66 },
    { x: .0038, y: -.0020, strength: .54, radius: .0018, count: 30 },
    { x: .0060, y: -.0032, strength: .22, radius: .0013, count: 16 },
  ];
  const points = clusters.flatMap((cluster, c) => Array.from({ length: cluster.count }, (_, i) => {
    const angle = i * 2.399963229728653 + c * .8;
    const distance = Math.sqrt((i + .5) / cluster.count) * cluster.radius;
    return {
      lng: lng + (cluster.x + Math.cos(angle) * distance) * longitudeScale,
      lat: lat + cluster.y + Math.sin(angle) * distance * .7,
      weight: cluster.strength * (.75 + .25 * (1 - distance / cluster.radius)),
      source: "synthetic_example" as const,
    };
  }));
  return { bodyId: body.id, source: "synthetic_example", center: { lat, lng },
    bounds: [lng - .013 * longitudeScale, lat - .009, lng + .013 * longitudeScale, lat + .009], points };
}

export function densityGeoJSON(scenario: DensityScenario) {
  return { type: "FeatureCollection" as const, features: scenario.points.map(point => ({
    type: "Feature" as const, properties: { weight: point.weight, source: point.source, waterBody: scenario.bodyId },
    geometry: { type: "Point" as const, coordinates: [point.lng, point.lat] },
  })) };
}

/** Stable kernel field for the no-WebGL fallback. Its maximum is an index, not kg. */
export function densityField(scenario: DensityScenario, width: number, height: number, radius = 13) {
  const field = new Float32Array(width * height);
  const [west, south, east, north] = scenario.bounds;
  const sigma = Math.max(2, radius), reach = Math.ceil(sigma * 3), denominator = 2 * sigma * sigma;
  for (const point of scenario.points) {
    const px = (point.lng - west) / (east - west) * width;
    const py = (north - point.lat) / (north - south) * height;
    for (let y = Math.max(0, Math.floor(py - reach)); y < Math.min(height, Math.ceil(py + reach)); y++) {
      for (let x = Math.max(0, Math.floor(px - reach)); x < Math.min(width, Math.ceil(px + reach)); x++) {
        field[y * width + x] += point.weight * Math.exp(-((x - px) ** 2 + (y - py) ** 2) / denominator);
      }
    }
  }
  let maximum = 0;
  for (const value of field) if (value > maximum) maximum = value;
  if (maximum) for (let i = 0; i < field.length; i++) field[i] /= maximum;
  return field;
}

export function densityRGB(value: number): [number, number, number] {
  const position = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * (densityColours.length - 1);
  const index = Math.min(densityColours.length - 2, Math.floor(position)), fraction = position - index;
  const colour = (hex: string) => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
  const a = colour(densityColours[index]), b = colour(densityColours[index + 1]);
  return a.map((v, i) => Math.round(v + (b[i] - v) * fraction)) as [number, number, number];
}

/** Web Mercator pixels: shared by the 2D basemap, heat layer and team marker. */
export function mapPixel(lng: number, lat: number, zoom: number) {
  const size = 256 * 2 ** zoom, latitude = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sine = Math.sin(latitude * Math.PI / 180);
  return { x: (lng + 180) / 360 * size, y: (.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * size };
}
export function mapCoordinate(x: number, y: number, zoom: number) {
  const size = 256 * 2 ** zoom;
  return { lng: ((x / size * 360) % 360 + 360) % 360 - 180,
    lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * Math.max(0, Math.min(size, y)) / size))) * 180 / Math.PI };
}
