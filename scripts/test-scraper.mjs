// scripts/test-scraper.mjs
import * as cheerio from "cheerio";

async function testScrape() {
  const TARGET_URL = "https://wzstats.gg/";

  console.log(`📡 Consultando ${TARGET_URL}...`);

  try {
    const response = await fetch(TARGET_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
    });

    console.log(`Status HTTP: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error("❌ El sitio bloqueó la petición o devolvió error.");
      return;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 1. Probar si contiene el script de Next.js
    const nextData = $("#__NEXT_DATA__").html();
    if (nextData) {
      console.log("✅ Encontrada etiqueta __NEXT_DATA__!");
      const parsed = JSON.parse(nextData);
      console.log(
        "Claves encontradas:",
        Object.keys(parsed?.props?.pageProps || {}),
      );
      return;
    }

    // 2. Si no hay __NEXT_DATA__, inspeccionamos el HTML renderizado
    console.log("ℹ️ No hay __NEXT_DATA__, analizando HTML estático...");
    const title = $("title").text();
    console.log(`Título de la página: "${title}"`);

    // Intentar buscar nombres de armas o tarjetas en el HTML
    const headings = [];
    $("h2, h3").each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.push(text);
    });

    console.log("Encabezados encontrados:", headings.slice(0, 10));
  } catch (error) {
    console.error("❌ Error en la conexión:", error.message);
  }
}

testScrape();
