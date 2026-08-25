import * as cheerio from "cheerio";

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

// export async function fetchAllWeaponStats(): Promise<Map<string, WeaponStats>> {
//   const now = Date.now();

//   if (cachedStatsMap && now - lastFetchTime < CACHE_TTL) {
//     return cachedStatsMap;
//   }
//   const url = "https://wzstats.gg/es/warzone/battle-royale/stats";
//   const res = await fetch(url, {
//     cache: "no-store",
//     headers: {
//       "User-Agent":
//         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
//       "Accept-Language": "es-ES,es;q=0.9",
//     },
//   });

//   if (!res.ok) throw new Error("Error al obtener datos de stats de Warzone");

//   const html = await res.text();
//   const $ = cheerio.load(html);
//   const weaponsMap = new Map<string, WeaponStats>();

//   // 1. Extraer TTK Promedio
//   $(".avg-row-head").each((_, el) => {
//     const rawName = $(el)
//       .text()
//       .replace(/actualizado/gi, "")
//       .trim();
//     const key = normalizeName(rawName);
//     if (!key) return;

//     const row = $(el).parent();
//     const cells = row
//       .find(".avg-cell")
//       .map((_, c) => parseNumber($(c).text()))
//       .get();

//     weaponsMap.set(key, {
//       name: rawName,
//       ttkShort: cells[0] || 600,
//       ttkLong: cells[2] || cells[1] || 700,
//       fireRate: 0,
//       damagePerMag: 0,
//       bulletVelocity: 0,
//       effectiveRange: 0,
//       recoil: 0,
//       adsTime: 0,
//       moveSpeed: 0,
//       hipfireSpread: 0,
//       hitboxes: {
//         distanceRanges: ["0-54m", "54-72m", "72m+"],
//         head: [0, 0, 0],
//         neck: [0, 0, 0],
//         chest: [0, 0, 0],
//         extremities: [0, 0, 0],
//       },
//     });
//   });

//   // 2. Extraer Secciones Generales (.st-data-row)
//   $(".st-data-row").each((_, row) => {
//     const rawText = $(row).text();
//     for (const [key, weapon] of weaponsMap.entries()) {
//       if (
//         rawText.toLowerCase().includes(key) ||
//         rawText.includes(weapon.name)
//       ) {
//         const textValues = $(row)
//           .children()
//           .map((_, c) => $(c).text().trim())
//           .get();
//         const nums = textValues.map((t) => parseNumber(t)).filter((n) => n > 0);

//         if (rawText.includes("rpm")) {
//           weapon.fireRate = nums[0] || weapon.fireRate;
//           weapon.damagePerMag = nums[1] || weapon.damagePerMag;
//         } else if (rawText.includes("m/s") && !rawText.includes("°/s")) {
//           weapon.bulletVelocity = nums[0] || weapon.bulletVelocity;
//           weapon.effectiveRange = nums[2] || nums[1] || weapon.effectiveRange;
//         } else if (rawText.includes("°/s")) {
//           weapon.recoil = nums[1] || nums[0] || weapon.recoil;
//         } else if (rawText.includes("ms") && !rawText.includes("rpm")) {
//           weapon.adsTime = nums[0] || weapon.adsTime;
//         } else if (rawText.includes("°") && !rawText.includes("°/s")) {
//           weapon.hipfireSpread = nums[0] || weapon.hipfireSpread;
//         }
//       }
//     }
//   });

//   // 3. Extraer Hitboxes / Daño por partes del cuerpo
//   let currentDistances: string[] = ["0-54m", "54-72m", "72m+"];
//   $(".dp-head").each((_, el) => {
//     const dists = $(el)
//       .find("div, span")
//       .map((_, d) => $(d).text().trim())
//       .get()
//       .filter(Boolean);
//     if (dists.length >= 2) currentDistances = dists;
//   });

//   $(".dp-row").each((_, row) => {
//     const label = $(row).find(".dp-cell-loc").text().trim().toLowerCase();
//     const vals = $(row)
//       .find(".dp-cell-val")
//       .map((_, c) => parseNumber($(c).text()))
//       .get();

//     for (const weapon of weaponsMap.values()) {
//       weapon.hitboxes.distanceRanges = currentDistances;
//       if (label.includes("cabeza")) weapon.hitboxes.head = vals;
//       else if (label.includes("cuello")) weapon.hitboxes.neck = vals;
//       else if (label.includes("pecho")) weapon.hitboxes.chest = vals;
//       else if (
//         label.includes("estómago") ||
//         label.includes("brazos") ||
//         label.includes("piernas")
//       ) {
//         weapon.hitboxes.extremities = vals;
//       }
//     }
//   });

//   cachedStatsMap = weaponsMap;
//   lastFetchTime = now;

//   return weaponsMap;
// }

// En src/services/stats.ts

export async function fetchAllWeaponStats(): Promise<Map<string, WeaponStats>> {
  const now = Date.now();
  if (cachedStatsMap && now - lastFetchTime < CACHE_TTL) {
    return cachedStatsMap;
  }

  // 1. Obtenemos la lista global de armas desde la página principal de armas/meta
  const urlMeta = "https://wzstats.gg/es/warzone/battle-royale/meta";
  const urlStats = "https://wzstats.gg/es/warzone/battle-royale/stats";

  const [resMeta, resStats] = await Promise.all([
    fetch(urlMeta, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    }),
    fetch(urlStats, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    }),
  ]);

  const weaponsMap = new Map<string, WeaponStats>();

  // 2. Extraer TODAS las armas existentes de la base de wzstats (del script __NEXT_DATA__ o links)
  if (resMeta.ok) {
    const htmlMeta = await resMeta.text();
    const $meta = cheerio.load(htmlMeta);

    // Intentamos leer el payload JSON nativo si existe
    const nextDataScript = $meta("#__NEXT_DATA__").html();
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);
        // Recorremos el árbol de datos para encontrar la lista global de armas
        const pageProps = nextData.props?.pageProps;
        const rawWeapons = pageProps?.weapons || pageProps?.ranking || [];

        for (const w of rawWeapons) {
          const rawName = w.name || w.weaponName;
          if (rawName) {
            const key = normalizeName(rawName);
            weaponsMap.set(key, {
              name: rawName,
              ttkShort: w.ttk || 600,
              ttkLong: 700,
              fireRate: w.rpm || w.fireRate || 0,
              damagePerMag: 0,
              bulletVelocity: w.bulletVelocity || 0,
              effectiveRange: w.effectiveRange || 0,
              recoil: 0,
              adsTime: w.adsTime || 0,
              moveSpeed: 0,
              hipfireSpread: 0,
              hitboxes: {
                distanceRanges: ["0-54m", "54-72m", "72m+"],
                head: [0, 0, 0],
                neck: [0, 0, 0],
                chest: [0, 0, 0],
                extremities: [0, 0, 0],
              },
            });
          }
        }
      } catch (e) {
        console.error("Error parsing __NEXT_DATA__:", e);
      }
    }

    // Fallback: extraer nombres de enlaces a armas en la vista meta
    if (weaponsMap.size === 0) {
      $meta("a[href*='/weapon/'], a[href*='/armas/']").each((_, el) => {
        const rawName = $meta(el)
          .text()
          .trim()
          .replace(/actualizado/gi, "");
        const key = normalizeName(rawName);
        if (key && !weaponsMap.has(key)) {
          weaponsMap.set(key, {
            name: rawName,
            ttkShort: 600,
            ttkLong: 700,
            fireRate: 0,
            damagePerMag: 0,
            bulletVelocity: 0,
            effectiveRange: 0,
            recoil: 0,
            adsTime: 0,
            moveSpeed: 0,
            hipfireSpread: 0,
            hitboxes: {
              distanceRanges: ["0-54m", "54-72m", "72m+"],
              head: [0, 0, 0],
              neck: [0, 0, 0],
              chest: [0, 0, 0],
              extremities: [0, 0, 0],
            },
          });
        }
      });
    }
  }

  // 3. Superponer las estadísticas detalladas de las tablas de /stats
  if (resStats.ok) {
    const htmlStats = await resStats.text();
    const $stats = cheerio.load(htmlStats);

    // Extraer TTK y fusionar con el mapa
    $stats(".avg-row-head").each((_, el) => {
      const rawName = $stats(el)
        .text()
        .replace(/actualizado/gi, "")
        .trim();
      const key = normalizeName(rawName);
      if (!key) return;

      const row = $stats(el).parent();
      const cells = row
        .find(".avg-cell")
        .map((_, c) => parseNumber($stats(c).text()))
        .get();

      const existing = weaponsMap.get(key) || {
        name: rawName,
        ttkShort: 600,
        ttkLong: 700,
        fireRate: 0,
        damagePerMag: 0,
        bulletVelocity: 0,
        effectiveRange: 0,
        recoil: 0,
        adsTime: 0,
        moveSpeed: 0,
        hipfireSpread: 0,
        hitboxes: {
          distanceRanges: ["0-54m", "54-72m", "72m+"],
          head: [0, 0, 0],
          neck: [0, 0, 0],
          chest: [0, 0, 0],
          extremities: [0, 0, 0],
        },
      };

      existing.ttkShort = cells[0] || existing.ttkShort;
      existing.ttkLong = cells[2] || cells[1] || existing.ttkLong;
      weaponsMap.set(key, existing);
    });

    // Extraer datos de filas generales (.st-data-row)
    $stats(".st-data-row").each((_, row) => {
      const rawText = $stats(row).text();
      for (const [key, weapon] of weaponsMap.entries()) {
        if (
          rawText.toLowerCase().includes(key) ||
          rawText.includes(weapon.name)
        ) {
          const textValues = $stats(row)
            .children()
            .map((_, c) => $stats(c).text().trim())
            .get();
          const nums = textValues
            .map((t) => parseNumber(t))
            .filter((n) => n > 0);

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
  }

  cachedStatsMap = weaponsMap;
  lastFetchTime = now;
  return weaponsMap;
}

export function formatComparisonResponse(
  w1: WeaponStats,
  w2: WeaponStats,
  showTable = false,
) {
  // Ancho dinámico para nombres largos (ej: "Lachmann Sub")
  const nameWidth = Math.max(w1.name.length, w2.name.length, 6);

  const ttkShortBars = renderBar(w1.ttkShort, w2.ttkShort, true);
  const rangeBars = renderBar(w1.effectiveRange, w2.effectiveRange, false);
  const adsBars = renderBar(w1.adsTime, w2.adsTime, true);
  const fireRateBars = renderBar(w1.fireRate, w2.fireRate, false);

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    {
      name: "⚡ Letalidad (TTK Corto Alcance)",
      value: `${alignRow(w1.name, w1.ttkShort || "N/D", "ms", nameWidth, 7)} ${ttkShortBars.barA}\n${alignRow(w2.name, w2.ttkShort || "N/D", "ms", nameWidth, 7)} ${ttkShortBars.barB}`,
      inline: false,
    },
    {
      name: "📏 Rango Efectivo",
      value: `${alignRow(w1.name, w1.effectiveRange || "N/D", "m", nameWidth, 6)} ${rangeBars.barA}\n${alignRow(w2.name, w2.effectiveRange || "N/D", "m", nameWidth, 6)} ${rangeBars.barB}`,
      inline: false,
    },
    {
      name: "🏃 Agilidad (Tiempo de Apuntado ADS)",
      value: `${alignRow(w1.name, w1.adsTime || "N/D", "ms", nameWidth, 7)} ${adsBars.barA}\n${alignRow(w2.name, w2.adsTime || "N/D", "ms", nameWidth, 7)} ${adsBars.barB}`,
      inline: false,
    },
    {
      name: "🔥 Cadencia de Fuego",
      value: `${alignRow(w1.name, w1.fireRate || "N/D", "RPM", nameWidth, 8)} ${fireRateBars.barA}\n${alignRow(w2.name, w2.fireRate || "N/D", "RPM", nameWidth, 8)} ${fireRateBars.barB}`,
      inline: false,
    },
  ];

  if (showTable) {
    const r = w1.hitboxes.distanceRanges[0] || "0-50m";
    const headBars = renderBar(
      w1.hitboxes.head[0] || 0,
      w2.hitboxes.head[0] || 0,
      false,
    );
    const chestBars = renderBar(
      w1.hitboxes.chest[0] || 0,
      w2.hitboxes.chest[0] || 0,
      false,
    );
    const extBars = renderBar(
      w1.hitboxes.extremities[0] || 0,
      w2.hitboxes.extremities[0] || 0,
      false,
    );

    fields.push({
      name: `‎\n🎯 Daño por Impacto (${r})`,
      value:
        `**Cabeza:**\n🟢 ${alignRow(w1.name, w1.hitboxes.head[0] || "N/D", "", nameWidth, 3)} ${headBars.barA}\n🔴 ${alignRow(w2.name, w2.hitboxes.head[0] || "N/D", "", nameWidth, 3)} ${headBars.barB}\n\n` +
        `**Pecho / Torso:**\n🟢 ${alignRow(w1.name, w1.hitboxes.chest[0] || "N/D", "", nameWidth, 3)} ${chestBars.barA}\n🔴 ${alignRow(w2.name, w2.hitboxes.chest[0] || "N/D", "", nameWidth, 3)} ${chestBars.barB}\n\n` +
        `**Extremidades:**\n🟢 ${alignRow(w1.name, w1.hitboxes.extremities[0] || "N/D", "", nameWidth, 3)} ${extBars.barA}\n🔴 ${alignRow(w2.name, w2.hitboxes.extremities[0] || "N/D", "", nameWidth, 3)} ${extBars.barB}`,
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
