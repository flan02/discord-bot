import * as cheerio from "cheerio";

async function testRankingScrape() {
  const TARGET_URL = "https://wzstats.gg/es";
  console.log(`📡 Scrapeando lista principal desde: ${TARGET_URL}...`);

  try {
    const res = await fetch(TARGET_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9",
      },
    });

    const html = await res.text();
    const $ = cheerio.load(html);

    console.log(`Status: ${res.status}`);

    const rawList = [];
    $("h1, h2, h3, h4, .font-bold").each((_, el) => {
      const t = $(el).text().replace(/\s+/g, " ").trim();
      if (t && t.length > 1 && t.length < 35 && !rawList.includes(t)) {
        rawList.push(t);
      }
    });

    // Filtramos los primeros 3 (banners) y tomamos las 10 armas
    const cleanWeapons = rawList.slice(3, 13).map((text, index) => {
      const cleanName = text.replace(/\b(buff|nerf|new)\b/gi, "").trim();
      return {
        posicion: `#${index + 1}`,
        nombre: cleanName.toUpperCase(),
        slug: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        comando: `/meta weapon:${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      };
    });

    console.log(`\n🎯 Armas extraídas (${cleanWeapons.length}):\n`);
    console.table(cleanWeapons);
  } catch (error) {
    console.error("❌ Error en el test:", error.message);
  }
}

testRankingScrape();

// node --env-file=.env scripts/test-ranking.mjs
