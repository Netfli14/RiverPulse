export type WaterReport = { id: string; createdAt: number; category: string; description: string; location: string; observedAt: string; status: "received" | "reviewing" | "resolved"; userId: string; demo: boolean; [key: string]: unknown };
const descriptions = ["Пластиковые бутылки скопились у берега.", "Плавающие пакеты рядом с пешеходным мостом.", "Пенопласт и упаковка на поверхности воды.", "Мусор задерживается среди прибрежных растений.", "После ветра у набережной появились стаканы и бутылки.", "Плавающий мусор в тихой заводи у берега."];
export const demoReports: WaterReport[] = Array.from({ length: 30 }, (_, i) => ({
  id: `demo-${String(i + 1).padStart(2, "0")}`, createdAt: Date.UTC(2026, 10, 2, 8, 0) - i * 1800000,
  category: "floating_litter", description: descriptions[i % descriptions.length], location: ["Ишим · набережная", "Ишим · пешеходный мост", "Ишим · прибрежная зона"][i % 3],
  observedAt: new Date(Date.UTC(2026, 10, 2, 8, 0) - i * 1800000).toISOString(), status: i < 18 ? "received" : i < 26 ? "reviewing" : "resolved", userId: "demo", demo: true,
}));
