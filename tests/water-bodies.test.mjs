import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'waterguard-rivers-'));
const file = path.join(root, 'water-bodies.cjs');
fs.writeFileSync(file, ts.transpileModule(fs.readFileSync('lib/water-bodies.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText);
const { waterBodies, waterMetrics, exampleWeeks, getWaterBody, waterPosition, exampleWeekCSV } = createRequire(import.meta.url)(file);
after(() => fs.rmSync(root, { recursive: true, force: true }));

test('Sarykol keeps the team coordinates and cannot inherit Ishim robot GPS', () => {
  const sarykol = getWaterBody('sarykol');
  assert.deepEqual(sarykol.coordinates, { lat: 42.53565, lng: 68.288398 });
  assert.equal(sarykol.robotId, null);
  const gps = { lat: 51.16, lng: 71.43 };
  assert.deepEqual(waterPosition(sarykol, gps), sarykol.coordinates);
  assert.deepEqual(waterPosition(getWaterBody('esil'), gps), gps);
});

test('each river has exactly seven consecutive, explicitly synthetic daily rows', () => {
  for (const body of waterBodies) {
    const rows = exampleWeeks[body.id];
    assert.equal(rows.length, 7);
    assert.equal(new Set(rows.map(row => row.date)).size, 7);
    rows.forEach((row, index) => {
      assert.equal(row.source, 'synthetic_example');
      assert.equal('receivedAt' in row, false);
      assert.equal('seq' in row, false);
      if (index) assert.equal(Date.parse(row.date) - Date.parse(rows[index - 1].date), 86400000);
      for (const metric of waterMetrics) assert.ok(Number.isFinite(row[metric.key]));
    });
  }
});

test('CSV retains synthetic provenance, exact location and all seven rows outside the UI', () => {
  for (const body of waterBodies) {
    const [header, ...rows] = exampleWeekCSV(body).split('\n');
    assert.equal(rows.length, 7);
    assert.ok(header.startsWith('data_type,water_body_id,date,latitude,longitude,'));
    for (const row of rows) {
      const fields = row.split(',');
      assert.equal(fields[0], 'synthetic_example');
      assert.equal(fields[1], body.id);
      assert.equal(Number(fields[3]), body.coordinates.lat);
      assert.equal(Number(fields[4]), body.coordinates.lng);
      assert.equal(fields.length, 10);
    }
  }
});
