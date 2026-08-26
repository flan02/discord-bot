import * as cheerio from "cheerio";
import { BLACKLIST, MetaRankedWeapon, WeaponStats } from "@/types";

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
        slug: item.slug,
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

  $(".st-data-row").each((_, row) => {
    const rowText = $(row).text();

    for (const [key, weapon] of weaponsMap.entries()) {
      if (
        rowText.toLowerCase().includes(key) ||
        rowText.includes(weapon.name)
      ) {
        // Obtenemos solo celdas con valores numéricos excluyendo las que contienen el nombre del arma
        const cells = $(row)
          .children()
          .map((_, c) => $(c).text().trim())
          .get()
          .filter(
            (t) => !t.toLowerCase().includes(key) && !t.includes(weapon.name),
          );

        const nums = cells.map((t) => parseNumber(t)).filter((n) => n > 0);

        if (rowText.includes("rpm")) {
          weapon.fireRate = nums[0] || weapon.fireRate;
          weapon.damagePerMag = nums[1] || weapon.damagePerMag;
        } else if (rowText.includes("m/s") && !rowText.includes("°/s")) {
          weapon.bulletVelocity = nums[0] || weapon.bulletVelocity;
          weapon.effectiveRange = nums[2] || nums[1] || weapon.effectiveRange;
        } else if (rowText.includes("°/s")) {
          weapon.recoil = nums[1] || nums[0] || weapon.recoil;
        } else if (rowText.includes("ms") && !rowText.includes("rpm")) {
          weapon.adsTime = nums[0] || weapon.adsTime;
        } else if (rowText.includes("°") && !rowText.includes("°/s")) {
          weapon.hipfireSpread = nums[0] || weapon.hipfireSpread;
        }
      }
    }
  });

  // 5. Extraer Hitboxes / Daño por partes del cuerpo
  let currentDistances: string[] = [];

  $(".dp-head").each((_, el) => {
    const textBlocks = $(el)
      .children()
      .map((_, d) => $(d).text().replace(/\s+/g, "").trim())
      .get()
      .filter((t) => t.length >= 2 && /\d/.test(t) && t !== "m");

    if (textBlocks.length >= 2) {
      currentDistances = textBlocks.map((t) => (t.endsWith("m") ? t : `${t}m`));
    }
  });

  // Detectamos únicamente la pestaña activa real en el DOM
  let activeWeaponName = "";
  $(".dp-tab, button.active, [data-active='true']").each((_, el) => {
    const text = $(el).text().trim();
    if (text) activeWeaponName = normalizeName(text);
  });

  // Búsqueda estricta: solo asigna si existe en el mapa (sin fallbacks arbitrarios)
  const activeWeapon = activeWeaponName
    ? weaponsMap.get(activeWeaponName)
    : null;

  if (activeWeapon && currentDistances.length > 0) {
    activeWeapon.hitboxes.distanceRanges = currentDistances;

    $(".dp-row").each((_, row) => {
      const label = $(row).find(".dp-cell-loc").text().trim().toLowerCase();
      const vals = $(row)
        .find(".dp-cell-val")
        .map((_, c) => parseNumber($(c).text()))
        .get()
        .filter((n) => n > 0);

      if (vals.length > 0) {
        if (label.includes("cabeza")) activeWeapon.hitboxes.head = vals;
        else if (label.includes("cuello")) activeWeapon.hitboxes.neck = vals;
        else if (label.includes("pecho") || label.includes("torso"))
          activeWeapon.hitboxes.chest = vals;
        else if (
          label.includes("estómago") ||
          label.includes("brazos") ||
          label.includes("piernas") ||
          label.includes("muslos")
        ) {
          activeWeapon.hitboxes.extremities = vals;
        }
      }
    });
  }

  cachedStatsMap = weaponsMap;
  lastFetchTime = now;

  return weaponsMap;
}

// Consulta el endpoint exacto para rellenar las métricas de un arma bajo demanda
export async function getWeaponRealStats(
  weapon: WeaponStats,
): Promise<WeaponStats> {
  // Si ya tiene las hitboxes cargadas, no vuelve a consultar
  if (weapon.hitboxes.head.length > 0) return weapon;

  const url = `https://app.wzstats.gg/wz2/loadout-builder/context?weaponId=${weapon.slug}&tierlist=alMazrah&game=wz2&addAttachmentsLockedByDefault=true&language=es`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        Referer: "https://wzstats.gg/",
      },
    });

    if (!res.ok) return weapon;

    const json = await res.json();
    const base = json.data?.baseStats;
    if (!base) return weapon;

    const distanceRanges: string[] = [];
    const head: number[] = [];
    const neck: number[] = [];
    const chest: number[] = [];
    const extremities: number[] = [];

    // 1. PRIORIDAD: Usar damageProfile (valores exactos calculados que muestra la web)
    if (Array.isArray(base.damageProfile) && base.damageProfile.length > 0) {
      for (let i = 0; i < base.damageProfile.length; i++) {
        const p = base.damageProfile[i];
        const start = Math.round(p.start ?? 0);
        const end = typeof p.end === "number" ? Math.round(p.end) : -1;

        if (end === -1 || end === 0 || i === base.damageProfile.length - 1) {
          distanceRanges.push(`${start}m+`);
        } else {
          distanceRanges.push(`${start}-${end}m`);
        }

        head.push(p.head ?? 0);
        neck.push(p.neck ?? 0);
        chest.push(p.upperChest ?? p.chest ?? 0);
        extremities.push(p.lowerBody ?? p.upperLegs ?? p.lowerLegs ?? 0);
      }

      if (
        typeof base.damageProfile[0]?.end === "number" &&
        base.damageProfile[0].end > 0
      ) {
        weapon.effectiveRange = Math.round(base.damageProfile[0].end);
      }
    } else {
      // 2. FALLBACK: Cálculo manual si damageProfile no viene presente
      const ranges = base.damageRanges || [];
      const headMod = base.headshotModifier || 1;
      const neckMod = base.neckModifier || 1;
      const chestMod = base.upperChestModifier || 1;
      const extMod = base.upperLegsModifier || base.lowerBodyModifier || 0.8;

      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        const start = r.start || 0;
        const end = r.end || 0;
        const dmg = r.damage || 0;

        if (end === 0 || i === ranges.length - 1) {
          distanceRanges.push(`${start}m+`);
        } else {
          distanceRanges.push(`${start}-${end}m`);
        }

        head.push(Math.round(dmg * headMod));
        neck.push(Math.round(dmg * neckMod));
        chest.push(Math.round(dmg * chestMod));
        extremities.push(Math.round(dmg * extMod));
      }

      weapon.effectiveRange = ranges[0]?.end || 0;
    }

    const rpm = base.fireRate || 600;
    const ttkShort =
      chest[0] > 0
        ? Math.round((Math.ceil(250 / chest[0]) - 1) * ((60 / rpm) * 1000))
        : 0;
    const ttkLong =
      chest[chest.length - 1] > 0
        ? Math.round(
            (Math.ceil(250 / chest[chest.length - 1]) - 1) *
              ((60 / rpm) * 1000),
          )
        : 0;

    weapon.ttkShort = ttkShort;
    weapon.ttkLong = ttkLong;
    weapon.fireRate = rpm;
    weapon.damagePerMag = Math.round((base.magSize || 30) * (chest[0] || 30));
    weapon.bulletVelocity = base.bulletVelocity || 0;
    weapon.adsTime =
      base.aimDownSightSpeed || base.adsSpeed || base.adsTime || 0;
    weapon.moveSpeed = base.movementSpeed || 0;
    weapon.hipfireSpread = base.hipfireMaxSpread || 0;
    weapon.hitboxes = {
      distanceRanges,
      head,
      neck,
      chest,
      extremities,
    };

    return weapon;
  } catch (err) {
    console.error(`Error al enriquecer stats para ${weapon.slug}:`, err);
    return weapon;
  }
}
