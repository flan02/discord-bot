// 1. Módulo Meta (WZHub) ➔ 2. Slash Command con opciones ➔ 3. Embeds visuales ➔ 4. API de Stats (Activision)

import { WeaponBuild } from "@/types";

const META_LOADOUTS: WeaponBuild[] = [
  {
    id: "kar98k",
    name: "Kar98k",
    category: "Sniper Rifle",
    tier: "Meta absolute",
    image:
      "https://www.wzhub.gg/_next/image?url=%2Fimages%2Fweapons%2Fkar98k.png&w=640&q=75",
    attachments: [
      { slot: "Muzzle", name: "Sonic Suppressor L" },
      { slot: "Barrel", name: "Prazisionsgewehr 762" },
      { slot: "Optic", name: "Rangefinder 4x" },
      { slot: "Stock", name: "Heavy Recon Stock" },
      { slot: "Ammunition", name: "7.92x57mm High Grain" },
    ],
  },
  {
    id: "superi46",
    name: "Superi 46",
    category: "SMG",
    tier: "Meta absolute",
    image:
      "https://www.wzhub.gg/_next/image?url=%2Fimages%2Fweapons%2Fsuperi46.png&w=640&q=75",
    attachments: [
      { slot: "Muzzle", name: "ZEHMN35 Compensated Flash Hider" },
      { slot: "Barrel", name: "Zulu OP3 Light Barrel" },
      { slot: "Stock", name: "Rescue-9 Stock" },
      { slot: "Underbarrel", name: "DR-6 Handstop" },
      { slot: "Magazine", name: "40 Round Mag" },
    ],
  },
];

export function getMetaBuilds(): WeaponBuild[] {
  return META_LOADOUTS;
}

export function findWeaponBuild(query: string): WeaponBuild | undefined {
  const cleanQuery = query.toLowerCase().trim();
  return META_LOADOUTS.find(
    (w) =>
      w.name.toLowerCase().includes(cleanQuery) ||
      w.id.toLowerCase().includes(cleanQuery),
  );
}

export function formatBuildEmbed(build: WeaponBuild) {
  return {
    title: `💥 Meta class: ${build.name}`,
    description: `**Category:** ${build.category} | **Tier:** ${build.tier}`,
    color: 0xff4500, // Color naranja / Warzone
    fields: build.attachments.map((att) => ({
      name: `🔧 ${att.slot}`,
      value: att.name,
      inline: true,
    })),
    thumbnail: build.image ? { url: build.image } : undefined,
    footer: {
      text: "Warzone Meta • Fuente: WZHub",
    },
    timestamp: new Date().toISOString(),
  };
}
