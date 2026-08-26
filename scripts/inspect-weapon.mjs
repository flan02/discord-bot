import fs from "fs";

async function testWeaponContext(weaponSlug) {
  const url = `https://app.wzstats.gg/wz2/loadout-builder/context?weaponId=${weaponSlug}&tierlist=alMazrah&game=wz2&addAttachmentsLockedByDefault=true&language=es`;
  console.log(`\n🔍 Consultando context para: ${weaponSlug}...`);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        Referer: "https://wzstats.gg/",
      },
    });

    console.log(`Status HTTP: ${res.status}`);
    if (!res.ok) {
      console.log(`❌ Error al consultar ${weaponSlug}`);
      return;
    }

    const data = await res.json();
    console.log("✅ Propiedades recibidas:", Object.keys(data));

    // Guardamos la respuesta para inspeccionar la estructura de daño
    fs.writeFileSync(
      `context_${weaponSlug}.json`,
      JSON.stringify(data, null, 2),
    );
    console.log(`💾 Guardado en context_${weaponSlug}.json`);

    // Intentamos buscar las propiedades de daño o stats
    const stats = data.stats || data.weapon || data.damageTable || data;
    console.log(
      "Muestra de datos:",
      JSON.stringify(stats).slice(0, 300) + "...",
    );
  } catch (error) {
    console.error("❌ Error en la petición:", error.message);
  }
}

async function run() {
  await testWeaponContext("x9-maverick");
  await testWeaponContext("mk35-isr");
}

run();
