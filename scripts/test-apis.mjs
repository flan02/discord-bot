// scripts/test-api.mjs

async function testWeapon(weaponSlug) {
  // Probamos combinaciones comunes de tierlist y game
  const testUrls = [
    {
      label: "Actual (alMazrah / wz2)",
      url: `https://app.wzstats.gg/wz2/loadout-builder/context?weaponId=${weaponSlug}&tierlist=alMazrah&game=wz2&addAttachmentsLockedByDefault=true&language=es`,
    },
    {
      label: "Battle Royale / BO7",
      url: `https://app.wzstats.gg/wz2/loadout-builder/context?weaponId=${weaponSlug}&tierlist=battleRoyale&game=bo7&addAttachmentsLockedByDefault=true&language=es`,
    },
    {
      label: "Battle Royale / WZ",
      url: `https://app.wzstats.gg/wz2/loadout-builder/context?weaponId=${weaponSlug}&tierlist=battleRoyale&game=wz&addAttachmentsLockedByDefault=true&language=es`,
    },
    {
      label: "Warzone / Warzone",
      url: `https://app.wzstats.gg/wz2/loadout-builder/context?weaponId=${weaponSlug}&tierlist=warzone&game=warzone&addAttachmentsLockedByDefault=true&language=es`,
    },
  ];

  for (const item of testUrls) {
    console.log(`\n========================================`);
    console.log(`🔍 Probando: ${item.label}`);
    console.log(`🔗 URL: ${item.url}`);

    try {
      const res = await fetch(item.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
          Referer: "https://wzstats.gg/es/warzone/battle-royale/stats",
        },
      });

      if (!res.ok) {
        console.log(`❌ Status: ${res.status}`);
        continue;
      }

      const json = await res.json();
      const base = json.data?.baseStats;

      if (!base) {
        console.log("⚠️ No se encontró baseStats en la respuesta.");
        continue;
      }

      console.log("✅ baseStats encontrado!");
      console.log(
        "🎯 damageProfile:",
        JSON.stringify(base.damageProfile, null, 2),
      );
      console.log(
        "📏 damageRanges:",
        JSON.stringify(base.damageRanges, null, 2),
      );
      console.log("⚡ ADS Speed:", base.aimDownSightSpeed || base.adsSpeed);
    } catch (err) {
      console.error(`💥 Error:`, err.message);
    }
  }
}

// Probamos con la VX COMPACT
testWeapon("vx-compact");
