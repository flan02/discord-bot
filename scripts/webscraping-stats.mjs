import * as cheerio from "cheerio";

async function scanStats() {
  const url = "https://wzstats.gg/es/warzone/battle-royale/stats";

  try {
    console.log(`📡 Consultando ${url}...`);
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9",
      },
    });

    const html = await res.text();
    const $ = cheerio.load(html);

    console.log("\n=== 1. TÍTULOS Y SECCIONES PRINCIPALES ===");
    $("h1, h2, h3, h4, h5").each((_, el) => {
      const tag = el.tagName;
      const text = $(el).text().replace(/\s+/g, " ").trim();
      const className = $(el).attr("class") || "(sin clase)";
      if (text) console.log(`<${tag} class="${className}">: "${text}"`);
    });

    console.log("\n=== 2. TABLAS Y FILAS (Estructura de Daño / Hitboxes) ===");
    $("table").each((i, table) => {
      console.log(
        `\n--- Tabla #${i + 1} (class="${$(table).attr("class")}") ---`,
      );
      $(table)
        .find("tr")
        .slice(0, 8)
        .each((_, tr) => {
          const cells = $(tr)
            .find("th, td")
            .map((_, td) => $(td).text().replace(/\s+/g, " ").trim())
            .get();
          console.log("Fila:", cells.join(" | "));
        });
    });

    console.log("\n=== 3. CONTENEDORES DE ESTADÍSTICAS Y BARRAS ===");
    // Buscamos divs que contengan texto como TTK, Daño, Alcance, ms o m/s
    $("div")
      .filter((_, el) => {
        const text = $(el).children().length <= 3 ? $(el).text().trim() : "";
        return (
          /ms|dmg|m\/s|rpm|Cadencia|Alcance|TTK/i.test(text) && text.length < 50
        );
      })
      .slice(0, 15)
      .each((_, el) => {
        const className = $(el).attr("class") || "(sin clase)";
        const text = $(el).text().replace(/\s+/g, " ").trim();
        console.log(`[class="${className}"]: "${text}"`);
      });
  } catch (error) {
    console.error("❌ Error al escanear:", error);
  }
}

scanStats();
