// // scripts/scrap-guns-attch.mjs
// import * as cheerio from "cheerio";

// async function inspectHomeLinks() {
//   const TARGET_URL = "https://wzstats.gg/";

//   try {
//     const response = await fetch(TARGET_URL, {
//       headers: {
//         "User-Agent":
//           "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
//       },
//     });

//     const html = await response.text();
//     const $ = cheerio.load(html);

//     const links = [];
//     $("a").each((_, el) => {
//       const href = $(el).attr("href");
//       if (
//         href &&
//         (href.includes("loadout") ||
//           href.includes("gun") ||
//           href.includes("weapon") ||
//           href.includes("build") ||
//           href.includes("meta"))
//       ) {
//         links.push(href);
//       }
//     });

//     console.log("Enlaces encontrados en la home:");
//     console.log([...new Set(links)].slice(0, 20));

//     // También verificamos si hay algún bloque <script> con datos JSON embebidos (Angular state transfer)
//     const scripts = [];
//     $("script").each((_, el) => {
//       const content = $(el).html() || "";
//       if (
//         content.includes("loadout") ||
//         content.includes("attachments") ||
//         content.includes("fg42")
//       ) {
//         scripts.push(content.slice(0, 300));
//       }
//     });

//     console.log("\nScripts con datos encontrados:", scripts.length);
//     if (scripts.length > 0) {
//       console.log(scripts[0]);
//     }
//   } catch (error) {
//     console.error("❌ Error:", error.message);
//   }
// }

// inspectHomeLinks();

// scripts/scrap-guns-attch.mjs

import * as cheerio from "cheerio";

async function inspectBestLoadout(slug) {
  const cleanSlug = slug.toLowerCase().trim().replace(/\s+/g, "-"); // "superi 46" -> "superi-46"
  const TARGET_URL = `https://wzstats.gg/es/best-loadouts/${cleanSlug}`;
  console.log(`📡 Consultando ${TARGET_URL}...`);

  try {
    const response = await fetch(TARGET_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9",
        Cookie: "lang=es; i18next=es",
      },
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    // Eliminamos el header, nav y footer para quedarnos solo con el contenido
    $("nav, header, footer, app-navbar, app-footer, .navbar").remove();

    console.log("=== ELEMENTOS DETECTADOS EN EL CUERPO ===");

    const loadoutData = [];
    $("div, section, article").each((_, el) => {
      const cls = $(el).attr("class") || "";
      if (
        cls.includes("attachment") ||
        cls.includes("loadout") ||
        cls.includes("build") ||
        cls.includes("slot")
      ) {
        const text = $(el).text().replace(/\s+/g, " ").trim();
        if (text && text.length < 100) {
          loadoutData.push(`[${cls}] -> ${text}`);
        }
      }
    });

    if (loadoutData.length > 0) {
      console.log("Accesorios encontrados con clases específicas:");
      console.log(loadoutData.slice(0, 15));
    } else {
      console.log(
        "No se encontraron clases obvias, mostrando primeros textos del cuerpo limpio:",
      );
      const bodyTexts = [];
      $("body *").each((_, el) => {
        const t = $(el)
          .clone()
          .children()
          .remove()
          .end()
          .text()
          .replace(/\s+/g, " ")
          .trim();
        if (t && t.length > 2 && t.length < 50 && !bodyTexts.includes(t)) {
          bodyTexts.push(t);
        }
      });
      console.log(bodyTexts.slice(0, 25));
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

inspectBestLoadout("mk35-isr");
