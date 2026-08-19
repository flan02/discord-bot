// import * as cheerio from "cheerio";

// async function inspectSpanishBuild() {
//   const TARGET_URL = "https://wzstats.gg/es/best-loadouts/fg42";
//   console.log(`📡 Consultando ${TARGET_URL}...`);

//   try {
//     const res = await fetch(TARGET_URL, {
//       headers: {
//         "User-Agent":
//           "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
//       },
//     });

//     const html = await res.text();
//     const $ = cheerio.load(html);

//     // Extraer nombre y categoría principal
//     const weaponName = $("h1, h2, h3")
//       .first()
//       .text()
//       .replace(/\s+/g, " ")
//       .trim();
//     const rankTag = $(".loadout-tag, .category-position").first().text().trim();

//     console.log(`\n🔫 Arma: ${weaponName}`);
//     console.log(`🏷️ Clasificación: ${rankTag}`);

//     // Extraer cada tarjeta/columna de clase con su código
//     console.log("\n--- CLASES DETECTADAS ---");

//     // Buscamos contenedores de builds o bloques con código
//     $("*").each((_, el) => {
//       const text = $(el).text().trim();
//       if (text.includes("CÓDIGO") || text.includes("CODIGO")) {
//         const codeMatch = text.match(
//           /[A-Z0-9]{2,4}-[A-Z0-9]{4,6}-[A-Z0-9]{4,6}-[A-Z0-9]{2,4}/i,
//         );
//         if (codeMatch) {
//           console.log(`✅ Código de importación encontrado: ${codeMatch[0]}`);
//         }
//       }
//     });
//   } catch (error) {
//     console.error("❌ Error:", error.message);
//   }
// }

// inspectSpanishBuild();

// node --env-file=.env scripts/scrap-meta-loadout-es.mjs

// scripts/scrap-meta-loadout-es.mjs
import * as cheerio from "cheerio";

async function inspectSpanishBuild() {
  const TARGET_URL = "https://wzstats.gg/es/best-loadouts/fg42";
  console.log(`📡 Consultando ${TARGET_URL}...`);

  try {
    const res = await fetch(TARGET_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const html = await res.text();
    const $ = cheerio.load(html);

    console.log("=== BÚSQUEDA DE CÓDIGOS DE ARMA ===");

    // 1. Probar buscando por el formato exacto del código de CoD
    const fullText = $("body").text();
    const codeMatches =
      fullText.match(/[A-Z0-9]{3}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{4}/gi) || [];
    console.log("Códigos detectados en el texto global:", [
      ...new Set(codeMatches),
    ]);

    // 2. Inspeccionar clases relacionadas a 'code' o 'copy'
    const codeBlocks = [];
    $("[class*='code'], [class*='copy'], [class*='loadout']").each((_, el) => {
      const cls = $(el).attr("class") || "";
      const txt = $(el).text().replace(/\s+/g, " ").trim();
      if (
        txt.includes("A16") ||
        txt.toLowerCase().includes("código") ||
        txt.toLowerCase().includes("codigo")
      ) {
        codeBlocks.push(`[${cls}] -> ${txt}`);
      }
    });

    console.log("\nBloques de código encontrados:");
    console.log(codeBlocks.slice(0, 5));

    // 3. Inspeccionar encabezados de tipos de build (ej: SOPORTE DE FRANCOTIRADOR)
    console.log("\n=== TIPOS DE BUILDS DETECTADOS ===");
    $("h3, h4, h5, [class*='title'], [class*='build-name']").each((_, el) => {
      const t = $(el).text().trim();
      if (
        t.includes("FRANCOTIRADOR") ||
        t.includes("VELOCIDAD") ||
        t.includes("RECOMENDAD")
      ) {
        console.log(`Build: "${t}"`);
      }
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

inspectSpanishBuild();
