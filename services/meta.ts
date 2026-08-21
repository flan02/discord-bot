// services/meta.ts
import * as cheerio from "cheerio";

export type WeaponCategory =
  | "Fusil de asalto"
  | "Subfusil"
  | "Fusil de precisión"
  | "Ametralladora ligera"
  | "Fusil de combate"
  | "Escopeta"
  | "Pistola"
  | "Warzone Meta";

export interface Attachment {
  slot: string;
  name: string;
}

export interface WeaponBuild {
  id: string;
  name: string;
  category?: WeaponCategory | string;
  tier?: string;
  rank?: string;
  buildType?: string;
  code?: string | null;
  image?: string;
  attachments: Attachment[];
  aliases?: string[];
}

export interface MetaRankedWeapon {
  name: string;
  slug: string;
  rank?: string;
  category?: string;
  status?: string;
}

// Fallback local por si la web llega a fallar
export const META_LOADOUTS: WeaponBuild[] = [
  {
    id: "fg42",
    name: "FG42",
    category: "Fusil de asalto",
    tier: "Meta Absoluto",
    rank: "#1 Largo Alcance",
    buildType: "SOPORTE DE FRANCOTIRADOR",
    code: "A16-34FIQ-XHAUL-11",
    attachments: [
      { slot: "Mira", name: "FANG HOVERPOINT ELO" },
      { slot: "Bocacha", name: "SILENCIADOR REDWELL SHADE-X" },
      { slot: "Acople", name: "GUARDA DIRGE" },
      { slot: "Cargador", name: "CARGADOR AMPLIADO DEBASE" },
      { slot: "Mods de Disparo", name: "8X57 MM BLINDADA" },
    ],
    aliases: ["fg-42", "fg 42"],
  },
];

/**
 * Scraper dinámico en vivo contra wzstats.gg en español
 */
export async function scrapeLiveWeaponBuild(
  rawQuery: string,
): Promise<WeaponBuild | null> {
  const slug = rawQuery
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const targetUrl = `https://wzstats.gg/es/best-loadouts/${slug}`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9",
      },
      next: { revalidate: 3600 }, // Cache de 1 hora en Vercel
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // 1. Extraer nombre y rango
    const rawTitle = $("title").text();
    const weaponName =
      rawTitle
        .replace(/^Mejores clases de\s+/i, "")
        .replace(/\s+-\s+.*$/i, "")
        .trim() || rawQuery.toUpperCase();

    const rank =
      $(".category-position, .loadout-tag.first-place")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim() || "Meta Actual";

    // 2. Extraer código oficial de importación
    const code = $(".weapon-build-code").first().text().trim() || null;

    // 3. Extraer tipo de build
    const buildType =
      $("[class*='build-title'], [class*='loadout-title'], h4, h3")
        .filter((_, el) => {
          const t = $(el).text().toUpperCase();
          return (
            t.includes("FRANCOTIRADOR") ||
            t.includes("VELOCIDAD") ||
            t.includes("RECOMENDAD") ||
            t.includes("ALCANCE")
          );
        })
        .first()
        .text()
        .trim() || "Recomendado / Meta";

    // 4. Extraer accesorios
    const attachments: Attachment[] = [];
    $(".attachment-row").each((_, el) => {
      const name = $(el)
        .find(".attachment-name-no-image")
        .first()
        .text()
        .trim();
      const slot = $(el).find(".slot-name-no-image").first().text().trim();

      if (name && slot && attachments.length < 5) {
        attachments.push({ slot, name });
      }
    });

    return {
      id: slug,
      name: weaponName.toUpperCase(),
      category: "Warzone Meta",
      tier: "Meta Actual",
      rank,
      buildType,
      code,
      attachments,
    };
  } catch (error) {
    console.error(`Error scraping live build for ${slug}:`, error);
    return null;
  }
}

/**
 * Busca el arma: intenta primero en vivo; si no existe o falla, busca en local
 */
export async function findWeaponBuild(
  query: string,
): Promise<WeaponBuild | undefined> {
  const liveBuild = await scrapeLiveWeaponBuild(query);
  if (liveBuild && liveBuild.attachments.length > 0) {
    return liveBuild;
  }

  // Fallback a array local
  const clean = query.toLowerCase().trim();
  return META_LOADOUTS.find(
    (w) =>
      w.name.toLowerCase().includes(clean) ||
      w.id.toLowerCase().includes(clean) ||
      w.aliases?.some((alias) => alias.toLowerCase().includes(clean)),
  );
}

export function getMetaBuilds(): WeaponBuild[] {
  return META_LOADOUTS;
}

/**
 * Genera el Embed formateado para Discord con el bloque de código copiable
 */
export function formatBuildEmbed(build: WeaponBuild) {
  const codeBlock = build.code
    ? `**Código para importar en Warzone:**\n\`\`\`\n${build.code}\n\`\`\`\n*(Copiá el código y pegalo directo en el Armero)*`
    : `*(Código de importación rápida no disponible)*`;

  const description = [
    build.rank ? `**Clasificación:** ${build.rank} ` : undefined,
    build.buildType ? `**Variante:** ${build.buildType}` : undefined,
    `\n${codeBlock}`,
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    title: `💥 Clase Meta: ${build.name}`,
    description,
    color: 0x1e90ff, // Dodger Blue
    fields: build.attachments.map((att) => ({
      name: `🔧 ${att.slot}`,
      value: att.name,
      inline: true,
    })),
    thumbnail: build.image ? { url: build.image } : undefined,
    footer: {
      text: "Warzone Meta • Datos oficiales wzstats.gg/es",
    },
    timestamp: new Date().toISOString(),
  };
}

export async function fetchMetaRanking(): Promise<MetaRankedWeapon[]> {
  const TARGET_URL = "https://wzstats.gg/es";

  try {
    const res = await fetch(TARGET_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9",
      },
      next: { revalidate: 3600 }, // Caché de 1 hora en Vercel
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

    // ✂️ Salteamos los 3 primeros (banners) y tomamos las 10 armas meta
    return rawList.slice(3, 13).map((text) => {
      const cleanName = text.replace(/\b(buff|nerf|new)\b/gi, "").trim();
      return {
        name: cleanName.toUpperCase(),
        slug: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      };
    });
  } catch (error) {
    console.error("Error al obtener ranking meta:", error);
    return [];
  }
}

export function formatRankingEmbed(list: MetaRankedWeapon[]) {
  if (list.length === 0) {
    return {
      title: "🏆 Top Meta Warzone",
      description:
        "No se pudieron obtener las armas meta en este momento. Intentá más tarde.",
      color: 0xff4500,
    };
  }

  const fields = list.map((w, index) => {
    const statusText = w.status ? ` \`[${w.status}]\`` : "";
    return {
      name: `${index + 1}. ${w.name}${statusText}`,
      value: `👉 \`/meta weapon:${w.slug}\``,
      inline: false,
    };
  });

  return {
    title: "🏆 TOP ARMAS META — WARZONE",
    description:
      "Estas son las armas más fuertes del parche actual clasificadas por rol.\nUsa `/meta weapon:[nombre]` para ver los accesorios y el código copiable.",
    color: 0xff4500,
    fields,
    footer: {
      text: "Warzone Meta Bot • Datos en vivo de wzstats.gg/es",
    },
    timestamp: new Date().toISOString(),
  };
}
