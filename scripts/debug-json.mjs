// import * as cheerio from "cheerio";
// import fs from "fs";

// async function dumpStatsData() {
//   const url = "https://wzstats.gg/es/warzone/battle-royale/stats";
//   console.log("📥 Descargando HTML de wzstats...");

//   const res = await fetch(url, {
//     headers: {
//       "User-Agent":
//         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
//       "Accept-Language": "es-ES,es;q=0.9",
//     },
//   });

//   const html = await res.text();
//   const $ = cheerio.load(html);

//   // 1. Buscamos __NEXT_DATA__
//   const nextDataScript = $("#__NEXT_DATA__").html();
//   if (nextDataScript) {
//     try {
//       const parsed = JSON.parse(nextDataScript);
//       fs.writeFileSync("next_data.json", JSON.stringify(parsed, null, 2));
//       console.log("✅ __NEXT_DATA__ guardado con éxito en next_data.json");

//       const props = parsed.props?.pageProps;
//       console.log("Claves principales encontradas:", Object.keys(props || {}));
//       return;
//     } catch (e) {
//       console.log("❌ Error parseando __NEXT_DATA__:", e.message);
//     }
//   }

//   // 2. Buscamos otros scripts con datos JSON inline
//   $("script").each((i, el) => {
//     const content = $(el).html() || "";
//     if (
//       content.includes("MK35") ||
//       content.includes("mk35") ||
//       content.includes("0-44.5")
//     ) {
//       console.log(`🎯 Encontrado script relevante (#${i}) con datos de armas!`);
//       fs.writeFileSync(`script_${i}.txt`, content.slice(0, 2000));
//     }
//   });
// }

// dumpStatsData();

import * as cheerio from "cheerio";
import fs from "fs";

async function dumpStatsData() {
  const url = "https://wzstats.gg/es/warzone/battle-royale/stats";
  console.log("📥 Descargando HTML de wzstats...");

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "es-ES,es;q=0.9",
    },
  });

  const html = await res.text();
  const $ = cheerio.load(html);

  $("script").each((i, el) => {
    const content = $(el).html() || "";
    if (
      content.includes("MK35") ||
      content.includes("mk35") ||
      content.includes("0-44.5")
    ) {
      console.log(`🎯 Guardando script #${i}...`);
      // Guardamos el contenido completo para inspeccionarlo
      fs.writeFileSync(`script_${i}_completo.json`, content);
    }
  });

  console.log("✅ Archivo guardado. Listo para inspeccionar.");
}

dumpStatsData();
