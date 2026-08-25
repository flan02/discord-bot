import * as cheerio from "cheerio";
import { MetaRankedWeapon } from "./meta";

export interface WeaponStats {
  name: string;
  ttkShort: number; // Corto alcance (ms)
  ttkLong: number; // Largo alcance (ms)
  fireRate: number; // rpm
  damagePerMag: number;
  bulletVelocity: number; // m/s
  effectiveRange: number; // metros
  recoil: number; // °/s vertical o general
  adsTime: number; // ms
  moveSpeed: number; // m/s
  hipfireSpread: number; // °
  hitboxes: {
    distanceRanges: string[];
    head: number[];
    neck: number[];
    chest: number[];
    extremities: number[];
  };
}

// Variable en memoria RAM para evitar el límite de 2MB de Vercel
let cachedStatsMap: Map<string, WeaponStats> | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 horas

function normalizeName(str: string): string {
  return str
    .toLowerCase()
    .replace(/actualizado/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function parseNumber(text: string): number {
  const match = text.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function renderBar(
  valA: number,
  valB: number,
  lowerIsBetter = false,
  maxScore = 10,
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

export async function fetchAllWeapons(): Promise<MetaRankedWeapon[]> {
  const TARGET_URL = "https://wzstats.gg/es";

  try {
    const res = await fetch(TARGET_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);

    const rawList: string[] = [];
    $("h1, h2, h3, h4, .font-bold").each((_, el) => {
      const t = $(el).text().replace(/\s+/g, " ").trim();
      if (t && t.length > 1 && t.length < 35 && !rawList.includes(t)) {
        rawList.push(t);
      }
    });

    // Filtramos encabezados de secciones que no son armas
    const BLACKLIST = [
      "warzone",
      "meta",
      "ranking",
      "battle royale",
      "resurgimiento",
      "tier list",
      "temporada",
      "stats",
      "armas",
      "clases",
      "top",
    ];

    // const BLACKLIST_REGEX = /\b(tier|warzone|meta|ranking|battle|royale|resurgimiento|temporada|stats|armas|clases|top)\b/i;

    return rawList
      .filter((text) => {
        const lower = text.toLowerCase();
        return !BLACKLIST.some((word) => lower.includes(word));
      })
      .map((text) => {
        const tags: string[] = [];
        if (/buff/i.test(text)) tags.push("🟢 BUFF");
        if (/nerf/i.test(text)) tags.push("🔴 NERF");
        if (/new/i.test(text)) tags.push("🔵 NEW");

        const cleanName = text.replace(/\b(buff|nerf|new)\b/gi, "").trim();
        const slug = cleanName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        return {
          name: cleanName.toUpperCase(),
          slug,
          //slug: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          status: tags.join(" • "),
        };
      })
      .filter((w) => w.name.length >= 2);
  } catch (error) {
    console.error("Error al obtener todas las armas meta:", error);
    return [];
  }
}

export async function fetchAllWeaponStats(): Promise<Map<string, WeaponStats>> {
  const now = Date.now();

  if (
    cachedStatsMap &&
    now - lastFetchTime < CACHE_TTL &&
    cachedStatsMap.size > 0
  ) {
    return cachedStatsMap;
  }

  const weaponsMap = new Map<string, WeaponStats>();

  // 1. Poblamos el mapa con TODAS las armas obtenidas de meta.ts
  try {
    const allMeta = await fetchAllWeapons();
    for (const item of allMeta) {
      const key = normalizeName(item.name);
      if (!key) continue;

      weaponsMap.set(key, {
        name: item.name,
        ttkShort: 0,
        ttkLong: 0,
        fireRate: 0,
        damagePerMag: 0,
        bulletVelocity: 0,
        effectiveRange: 0,
        recoil: 0,
        adsTime: 0,
        moveSpeed: 0,
        hipfireSpread: 0,
        hitboxes: {
          distanceRanges: [],
          head: [],
          neck: [],
          chest: [],
          extremities: [],
        },
      });
    }
  } catch (error) {
    console.error("Error al precargar armas con fetchAllWeapons:", error);
  }

  // 2. Traemos /stats para sobreescribir las métricas exactas
  const url = "https://wzstats.gg/es/warzone/battle-royale/stats";
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "es-ES,es;q=0.9",
    },
  });

  if (!res.ok) throw new Error("Error al obtener datos de stats de Warzone");

  const html = await res.text();
  const $ = cheerio.load(html);

  // 3. Extraer TTK Promedio
  $(".avg-row-head").each((_, el) => {
    const rawName = $(el)
      .text()
      .replace(/actualizado/gi, "")
      .trim();
    const key = normalizeName(rawName);
    if (!key) return;

    const row = $(el).parent();
    const cells = row
      .find(".avg-cell")
      .map((_, c) => parseNumber($(c).text()))
      .get();

    const item = weaponsMap.get(key) || {
      name: rawName,
      ttkShort: 0,
      ttkLong: 0,
      fireRate: 0,
      damagePerMag: 0,
      bulletVelocity: 0,
      effectiveRange: 0,
      recoil: 0,
      adsTime: 0,
      moveSpeed: 0,
      hipfireSpread: 0,
      hitboxes: {
        distanceRanges: [],
        head: [],
        neck: [],
        chest: [],
        extremities: [],
      },
    };

    item.ttkShort = cells[0] || 0;
    item.ttkLong = cells[2] || cells[1] || 0;
    weaponsMap.set(key, item);
  });

  // 4. Extraer Secciones Generales (.st-data-row)
  $(".st-data-row").each((_, row) => {
    const rawText = $(row).text();
    for (const [key, weapon] of weaponsMap.entries()) {
      if (
        rawText.toLowerCase().includes(key) ||
        rawText.includes(weapon.name)
      ) {
        const textValues = $(row)
          .children()
          .map((_, c) => $(c).text().trim())
          .get();
        const nums = textValues.map((t) => parseNumber(t)).filter((n) => n > 0);

        if (rawText.includes("rpm")) {
          weapon.fireRate = nums[0] || weapon.fireRate;
          weapon.damagePerMag = nums[1] || weapon.damagePerMag;
        } else if (rawText.includes("m/s") && !rawText.includes("°/s")) {
          weapon.bulletVelocity = nums[0] || weapon.bulletVelocity;
          weapon.effectiveRange = nums[2] || nums[1] || weapon.effectiveRange;
        } else if (rawText.includes("°/s")) {
          weapon.recoil = nums[1] || nums[0] || weapon.recoil;
        } else if (rawText.includes("ms") && !rawText.includes("rpm")) {
          weapon.adsTime = nums[0] || weapon.adsTime;
        } else if (rawText.includes("°") && !rawText.includes("°/s")) {
          weapon.hipfireSpread = nums[0] || weapon.hipfireSpread;
        }
      }
    }
  });

  // 5. Extraer Hitboxes / Daño por partes del cuerpo
  let currentDistances: string[] = [];
  $(".dp-head").each((_, el) => {
    const dists = $(el)
      .find("div, span")
      .map((_, d) => $(d).text().trim())
      .get()
      .filter(Boolean);
    if (dists.length >= 2) currentDistances = dists;
  });

  $(".dp-row").each((_, row) => {
    const label = $(row).find(".dp-cell-loc").text().trim().toLowerCase();
    const vals = $(row)
      .find(".dp-cell-val")
      .map((_, c) => parseNumber($(c).text()))
      .get();

    for (const weapon of weaponsMap.values()) {
      if (currentDistances.length > 0)
        weapon.hitboxes.distanceRanges = currentDistances;
      if (label.includes("cabeza")) weapon.hitboxes.head = vals;
      else if (label.includes("cuello")) weapon.hitboxes.neck = vals;
      else if (label.includes("pecho") || label.includes("torso"))
        weapon.hitboxes.chest = vals;
      else if (
        label.includes("estómago") ||
        label.includes("brazos") ||
        label.includes("piernas") ||
        label.includes("muslos")
      ) {
        weapon.hitboxes.extremities = vals;
      }
    }
  });

  cachedStatsMap = weaponsMap;
  lastFetchTime = now;

  return weaponsMap;
}

// export function formatComparisonResponse(
//   w1: WeaponStats,
//   w2: WeaponStats,
//   showTable = false,
// ) {
//   // Ancho dinámico para nombres largos (ej: "Lachmann Sub")
//   const nameWidth = Math.max(w1.name.length, w2.name.length, 6);

//   const ttkShortBars = renderBar(w1.ttkShort, w2.ttkShort, true);
//   const rangeBars = renderBar(w1.effectiveRange, w2.effectiveRange, false);
//   const adsBars = renderBar(w1.adsTime, w2.adsTime, true);
//   const fireRateBars = renderBar(w1.fireRate, w2.fireRate, false);

//   const fields: Array<{ name: string; value: string; inline?: boolean }> = [
//     {
//       name: "⚡ Letalidad (TTK Corto Alcance)",
//       value: `${alignRow(w1.name, w1.ttkShort || "N/D", "ms", nameWidth, 7)} ${ttkShortBars.barA}\n${alignRow(w2.name, w2.ttkShort || "N/D", "ms", nameWidth, 7)} ${ttkShortBars.barB}`,
//       inline: false,
//     },
//     {
//       name: "📏 Rango Efectivo",
//       value: `${alignRow(w1.name, w1.effectiveRange || "N/D", "m", nameWidth, 6)} ${rangeBars.barA}\n${alignRow(w2.name, w2.effectiveRange || "N/D", "m", nameWidth, 6)} ${rangeBars.barB}`,
//       inline: false,
//     },
//     {
//       name: "🏃 Agilidad (Tiempo de Apuntado ADS)",
//       value: `${alignRow(w1.name, w1.adsTime || "N/D", "ms", nameWidth, 7)} ${adsBars.barA}\n${alignRow(w2.name, w2.adsTime || "N/D", "ms", nameWidth, 7)} ${adsBars.barB}`,
//       inline: false,
//     },
//     {
//       name: "🔥 Cadencia de Fuego",
//       value: `${alignRow(w1.name, w1.fireRate || "N/D", "RPM", nameWidth, 8)} ${fireRateBars.barA}\n${alignRow(w2.name, w2.fireRate || "N/D", "RPM", nameWidth, 8)} ${fireRateBars.barB}`,
//       inline: false,
//     },
//   ];

//   if (showTable) {
//     const r = w1.hitboxes.distanceRanges[0] || "0-50m";
//     const headBars = renderBar(
//       w1.hitboxes.head[0] || 0,
//       w2.hitboxes.head[0] || 0,
//       false,
//     );
//     const chestBars = renderBar(
//       w1.hitboxes.chest[0] || 0,
//       w2.hitboxes.chest[0] || 0,
//       false,
//     );
//     const extBars = renderBar(
//       w1.hitboxes.extremities[0] || 0,
//       w2.hitboxes.extremities[0] || 0,
//       false,
//     );

//     fields.push({
//       name: `‎\n🎯 Daño por Impacto (${r})`,
//       value:
//         `**Cabeza:**\n🟢 ${alignRow(w1.name, w1.hitboxes.head[0] || "N/D", "", nameWidth, 3)} ${headBars.barA}\n🔴 ${alignRow(w2.name, w2.hitboxes.head[0] || "N/D", "", nameWidth, 3)} ${headBars.barB}\n\n` +
//         `**Pecho / Torso:**\n🟢 ${alignRow(w1.name, w1.hitboxes.chest[0] || "N/D", "", nameWidth, 3)} ${chestBars.barA}\n🔴 ${alignRow(w2.name, w2.hitboxes.chest[0] || "N/D", "", nameWidth, 3)} ${chestBars.barB}\n\n` +
//         `**Extremidades:**\n🟢 ${alignRow(w1.name, w1.hitboxes.extremities[0] || "N/D", "", nameWidth, 3)} ${extBars.barA}\n🔴 ${alignRow(w2.name, w2.hitboxes.extremities[0] || "N/D", "", nameWidth, 3)} ${extBars.barB}`,
//       inline: false,
//     });
//   }

//   return {
//     embeds: [
//       {
//         title: `⚔️ Comparativa: ${w1.name} vs ${w2.name}`,
//         color: 0x9146ff,
//         fields,
//         footer: {
//           text: "Datos extraídos de wzstats.gg • Warzone Battle Royale",
//         },
//         timestamp: new Date().toISOString(),
//       },
//     ],
//   };
// }

export function formatComparisonResponse(
  w1: WeaponStats,
  w2: WeaponStats,
  showTable = false,
) {
  const nameWidth = Math.max(w1.name.length, w2.name.length, 6);

  const ttkShortBars = renderBar(w1.ttkShort, w2.ttkShort, true);
  const rangeBars = renderBar(w1.effectiveRange, w2.effectiveRange, false);
  const adsBars = renderBar(w1.adsTime, w2.adsTime, true);
  const fireRateBars = renderBar(w1.fireRate, w2.fireRate, false);

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

      const r1 = (ranges[0] || "0-20m").padEnd(10, " ");
      const r2 = (ranges[1] || "20-40m").padEnd(10, " ");
      const r3 = (ranges[2] || "40m+").padEnd(8, " ");

      const getVal = (arr: number[] = [], idx: number) =>
        arr[idx] ? String(arr[idx]).padEnd(10, " ") : "-".padEnd(10, " ");

      const header =
        `Zona           | ${r1} | ${r2} | ${r3}\n` + "─".repeat(48);
      const rowHead = `Cabeza         | ${getVal(w.hitboxes?.head, 0)} | ${getVal(w.hitboxes?.head, 1)} | ${getVal(w.hitboxes?.head, 2).trim()}`;
      const rowChest = `Pecho / Torso  | ${getVal(w.hitboxes?.chest, 0)} | ${getVal(w.hitboxes?.chest, 1)} | ${getVal(w.hitboxes?.chest, 2).trim()}`;
      const rowExt = `Extremidades   | ${getVal(w.hitboxes?.extremities, 0)} | ${getVal(w.hitboxes?.extremities, 1)} | ${getVal(w.hitboxes?.extremities, 2).trim()}`;

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
