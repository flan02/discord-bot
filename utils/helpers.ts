import { WeaponStats } from "@/types";

export function findWeaponInMap(
  input: string,
  statsMap: Map<string, WeaponStats>,
): WeaponStats | undefined {
  const cleanInput = input.toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. Coincidencia directa por clave normalizada
  if (statsMap.has(cleanInput)) {
    return statsMap.get(cleanInput);
  }

  // 2. Coincidencia por nombre exacto normalizado
  for (const weapon of statsMap.values()) {
    const cleanName = weapon.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanName === cleanInput) return weapon;
  }

  // 3. Coincidencia parcial (empieza con...)
  for (const [key, weapon] of statsMap.entries()) {
    if (key.startsWith(cleanInput) || cleanInput.startsWith(key)) {
      return weapon;
    }
  }

  // 4. Coincidencia por inclusión segura
  for (const [key, weapon] of statsMap.entries()) {
    if (key.includes(cleanInput)) return weapon;
  }

  return undefined;
}

function renderBar(
  valA: number,
  valB: number,
  lowerIsBetter = false,
  maxScore = 6,
): { barA: string; barB: string } {
  if (valA === 0 && valB === 0) {
    return { barA: "🟪".repeat(maxScore), barB: "⬛".repeat(maxScore) };
  }

  const winA = lowerIsBetter ? valA < valB : valA > valB;
  const winB = lowerIsBetter ? valB < valA : valB > valA;

  const maxVal = Math.max(valA, valB);
  const ratioA = Math.max(1, Math.round((valA / maxVal) * maxScore));
  const ratioB = Math.max(1, Math.round((valB / maxVal) * maxScore));

  const barA = `${"🟪".repeat(ratioA)}${"⬛".repeat(maxScore - ratioA)}${winA ? " 🏆" : ""}`;
  const barB = `${"🟪".repeat(ratioB)}${"⬛".repeat(maxScore - ratioB)}${winB ? " 🏆" : ""}`;

  return { barA, barB };
}

// Formateador alineado con ancho fijo dentro de backticks
function alignRow(
  name: string,
  value: string | number,
  unit = "",
  nameWidth = 8,
  valWidth = 7,
): string {
  const formattedVal = `${value}${unit ? " " + unit : ""}`;
  return `\`${name.padEnd(nameWidth, " ")} ${formattedVal.padStart(valWidth, " ")}\``;
}

export function formatComparisonResponse(
  w1: WeaponStats,
  w2: WeaponStats,
  showTable = false,
) {
  const nameWidth = Math.max(w1.name.length, w2.name.length, 6);

  // maxScore = 6 para que la barra no desborde en pantallas angostas
  const ttkShortBars = renderBar(w1.ttkShort, w2.ttkShort, true, 6);
  const rangeBars = renderBar(w1.effectiveRange, w2.effectiveRange, false, 6);
  const adsBars = renderBar(w1.adsTime, w2.adsTime, true, 6);
  const fireRateBars = renderBar(w1.fireRate, w2.fireRate, false, 6);

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    {
      name: "⚡ Letalidad (TTK Corto Alcance)",
      value: `${alignRow(w1.name, w1.ttkShort || "N/D", w1.ttkShort ? "ms" : "", nameWidth, 7)} ${ttkShortBars.barA}\n${alignRow(w2.name, w2.ttkShort || "N/D", w2.ttkShort ? "ms" : "", nameWidth, 7)} ${ttkShortBars.barB}`,
      inline: false,
    },
    {
      name: "📏 Rango Efectivo",
      value: `${alignRow(w1.name, w1.effectiveRange || "N/D", w1.effectiveRange ? "m" : "", nameWidth, 6)} ${rangeBars.barA}\n${alignRow(w2.name, w2.effectiveRange || "N/D", w2.effectiveRange ? "m" : "", nameWidth, 6)} ${rangeBars.barB}`,
      inline: false,
    },
    {
      name: "🏃 Agilidad (Tiempo de Apuntado ADS)",
      value: `${alignRow(w1.name, w1.adsTime || "N/D", w1.adsTime ? "ms" : "", nameWidth, 7)} ${adsBars.barA}\n${alignRow(w2.name, w2.adsTime || "N/D", w2.adsTime ? "ms" : "", nameWidth, 7)} ${adsBars.barB}`,
      inline: false,
    },
    {
      name: "🔥 Cadencia de Fuego",
      value: `${alignRow(w1.name, w1.fireRate || "N/D", w1.fireRate ? "RPM" : "", nameWidth, 8)} ${fireRateBars.barA}\n${alignRow(w2.name, w2.fireRate || "N/D", w2.fireRate ? "RPM" : "", nameWidth, 8)} ${fireRateBars.barB}`,
      inline: false,
    },
  ];

  if (showTable) {
    const buildWeaponDamageBlock = (w: WeaponStats) => {
      const ranges = w.hitboxes?.distanceRanges?.length
        ? w.hitboxes.distanceRanges
        : ["Corta", "Media", "Larga"];

      // Columnas compactas de 6-7 caracteres
      const r1 = (ranges[0] || "0-20m").padEnd(6, " ");
      const r2 = (ranges[1] || "20-40m").padEnd(6, " ");
      const r3 = (ranges[2] || "40m+").padEnd(5, " ");

      const getVal = (arr: number[] = [], idx: number) =>
        arr[idx] !== undefined && arr[idx] !== null
          ? String(arr[idx]).padEnd(6, " ")
          : "-".padEnd(6, " ");

      const header = `Zona    | ${r1} | ${r2} | ${r3}\n` + "─".repeat(31);
      const rowHead = `Cabeza  | ${getVal(w.hitboxes?.head, 0)} | ${getVal(w.hitboxes?.head, 1)} | ${getVal(w.hitboxes?.head, 2).trim()}`;
      const rowChest = `Torso   | ${getVal(w.hitboxes?.chest, 0)} | ${getVal(w.hitboxes?.chest, 1)} | ${getVal(w.hitboxes?.chest, 2).trim()}`;
      const rowExt = `Extrem. | ${getVal(w.hitboxes?.extremities, 0)} | ${getVal(w.hitboxes?.extremities, 1)} | ${getVal(w.hitboxes?.extremities, 2).trim()}`;

      return `**${w.name}**\n\`\`\`text\n${header}\n${rowHead}\n${rowChest}\n${rowExt}\n\`\`\``;
    };

    fields.push({
      name: "🎯 Perfil de Daño y Caída por Distancia",
      value: `${buildWeaponDamageBlock(w1)}\n${buildWeaponDamageBlock(w2)}`,
      inline: false,
    });
  }

  return {
    embeds: [
      {
        title: `⚔️ Comparativa: ${w1.name} vs ${w2.name}`,
        color: 0x9146ff,
        fields,
        footer: {
          text: "Datos extraídos de wzstats.gg • Warzone Battle Royale",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
