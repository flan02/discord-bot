import * as cheerio from "cheerio";

async function scanDetailedStats() {
  const url = "https://wzstats.gg/es/warzone/battle-royale/stats";

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9",
      },
    });

    const html = await res.text();
    const $ = cheerio.load(html);

    console.log("=== 1. SELECTORES DE ARMAS DISPONIBLES ===");
    // Buscamos menús de selección o botones con nombres de armas
    $("select, [class*='weapon'], [class*='gun'], [class*='item']").each(
      (_, el) => {
        const text = $(el).text().replace(/\s+/g, " ").trim();
        const cls = $(el).attr("class") || "";
        if (
          text.length > 3 &&
          text.length < 50 &&
          // (text.includes("AN-94") ||
          (text.includes("rev-46") ||
            text.includes("MK35") ||
            text.includes("AK-27"))
          // text.includes("FG42"))
        ) {
          console.log(`[${el.tagName}.${cls}]: "${text}"`);
        }
      },
    );

    console.log("\n=== 2. ESTRUCTURA DE FILAS POR SECCIÓN ===");
    // Inspeccionamos las secciones de TTK, Daño y Partes del cuerpo
    $(".ttk-section-title, .avg-title").each((_, heading) => {
      const sectionName = $(heading).text().trim();
      console.log(`\n🔹 SECCIÓN: ${sectionName}`);

      // Tomamos los contenedores hermanos o padres más cercanos
      const parent = $(heading).closest(
        "section, div[class*='container'], div[class*='section'], div",
      );
      const rows = parent
        .find(
          "[class*='row'], [class*='grid'], [class*='item'], [class*='avg-cell'], tr",
        )
        .slice(0, 4);

      rows.each((_, r) => {
        const rowText = $(r).text().replace(/\s+/g, " ").trim();
        const rowClass = $(r).attr("class") || "(sin clase)";
        if (rowText && rowText.length < 120) {
          console.log(`  -> [class="${rowClass}"]: ${rowText}`);
        }
      });
    });

    console.log("\n=== 3. DATOS DE HITBOXES (DAÑO POR PARTE DEL CUERPO) ===");
    // Buscamos dónde figuran 'Cabeza', 'Pecho', 'Cuello', etc.
    $("*:contains('Cabeza'), *:contains('Pecho')")
      .last()
      .parent()
      .children()
      .each((_, el) => {
        const text = $(el).text().replace(/\s+/g, " ").trim();
        const cls = $(el).attr("class") || "(sin clase)";
        if (text.length < 100) {
          console.log(`  Hitbox item [${cls}]: "${text}"`);
        }
      });
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

scanDetailedStats();
