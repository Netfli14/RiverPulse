"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ExampleReading, WaterMetricKey } from "@/lib/water-bodies";

export default function WeeklyWaterChart({ data, metricKey, name, unit }: {
  data: (ExampleReading & { label: string })[];
  metricKey: WaterMetricKey;
  name: string;
  unit: string;
}) {
  return <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 12, right: 18, bottom: 4, left: 0 }}>
    <CartesianGrid stroke="var(--border)" vertical={false} />
    <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={18} />
    <YAxis width={48} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
    <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)" }} />
    <Line type="linear" dataKey={metricKey} name={name} unit={unit ? ` ${unit}` : ""} stroke="var(--teal)" strokeWidth={3} dot={{ r: 4, fill: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
  </LineChart></ResponsiveContainer>;
}
