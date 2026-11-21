import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'waterguard-density-'));
const require = createRequire(import.meta.url);
for (const name of ['water-bodies', 'waste-density']) {
  fs.writeFileSync(path.join(root, name + '.cjs'), ts.transpileModule(fs.readFileSync('lib/' + name + '.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText);
}
const { getWaterBody } = require(path.join(root, 'water-bodies.cjs'));
const { densityScenario, densityGeoJSON, densityField, densityRGB, mapPixel, mapCoordinate } = require(path.join(root, 'waste-density.cjs'));
after(() => fs.rmSync(root, { recursive: true, force: true }));

test('Sarykol density is centred on the supplied coordinates and stays separate from Ishim', () => {
  const sarykol = densityScenario(getWaterBody('sarykol'));
  const esil = densityScenario(getWaterBody('esil'));
  assert.deepEqual(sarykol.center, { lat: 42.53565, lng: 68.288398 });
  assert.notDeepEqual(sarykol.center, esil.center);
  for (const scenario of [sarykol, esil]) {
    const [west, south, east, north] = scenario.bounds;
    assert.ok(west < scenario.center.lng && scenario.center.lng < east);
    assert.ok(south < scenario.center.lat && scenario.center.lat < north);
    for (const p of scenario.points) {
      assert.ok(p.lng > west && p.lng < east && p.lat > south && p.lat < north);
      assert.ok(Number.isFinite(p.weight) && p.weight > 0 && p.weight <= 1);
      assert.ok(Math.abs(p.lat - scenario.center.lat) < .01);
    }
  }
});

test('the demo cannot acquire live telemetry fields or lose its provenance in GeoJSON', () => {
  const scenario = densityScenario(getWaterBody('sarykol'));
  assert.deepEqual(scenario, densityScenario(getWaterBody('sarykol')));
  const json = densityGeoJSON(scenario);
  assert.equal(json.type, 'FeatureCollection');
  for (const feature of json.features) {
    assert.equal(feature.properties.source, 'synthetic_example');
    assert.equal(feature.properties.waterBody, 'sarykol');
    assert.equal(feature.geometry.type, 'Point');
    assert.ok(feature.geometry.coordinates[0] > 68 && feature.geometry.coordinates[1] < 43);
    assert.equal('receivedAt' in feature.properties, false);
    assert.equal('seq' in feature.properties, false);
    assert.equal('kg' in feature.properties, false);
  }
});

test('the fallback field remains finite, normalised and concentrated around the modelled area', () => {
  const scenario = densityScenario(getWaterBody('sarykol'));
  const field = densityField(scenario, 80, 60, 5);
  assert.equal(field.length, 4800);
  let maximum = 0;
  for (const value of field) {
    assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
    maximum = Math.max(maximum, value);
  }
  assert.equal(maximum, 1);
  assert.ok(field[30 * 80 + 40] > field[0] + .5);
  assert.deepEqual(densityField({ ...scenario, points: [] }, 20, 10), new Float32Array(200));
});

test('density colours safely handle endpoints and invalid numerical inputs', () => {
  assert.deepEqual(densityRGB(-3), densityRGB(0));
  assert.deepEqual(densityRGB(3), densityRGB(1));
  assert.deepEqual(densityRGB(NaN), densityRGB(0));
  for (const n of [0, .13, .42, .7, 1]) for (const channel of densityRGB(n)) {
    assert.ok(Number.isInteger(channel) && channel >= 0 && channel <= 255);
  }
});

test('2D map projection keeps heat, cartography and marker aligned across zoom levels', () => {
  for (const [lng, lat] of [[68.288398, 42.53565], [71.4264, 51.1555], [-73.9, 40.7], [0, 0]]) {
    for (const zoom of [10, 14, 18]) {
      const p = mapPixel(lng, lat, zoom), coordinate = mapCoordinate(p.x, p.y, zoom);
      assert.ok(Math.abs(coordinate.lng - lng) < 1e-9);
      assert.ok(Math.abs(coordinate.lat - lat) < 1e-9);
      const next = mapPixel(lng, lat, zoom + 1);
      assert.ok(Math.abs(next.x - p.x * 2) < 1e-8);
      assert.ok(Math.abs(next.y - p.y * 2) < 1e-8);
    }
  }
  const p = mapPixel(68.288398, 42.53565, 14), shifted = mapCoordinate(p.x + 100, p.y, 14);
  assert.ok(shifted.lng > 68.288398);
  assert.ok(Math.abs(shifted.lat - 42.53565) < 1e-9);
});
