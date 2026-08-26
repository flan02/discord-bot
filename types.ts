export interface Attachment {
  slot: string; // muzzle, barrel, optic
  name: string; // monolithic suppressor
}

export const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
};

export const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
};

export type WeaponCategory =
  | "Fusil de asalto"
  | "Subfusil"
  | "Fusil de precisión"
  | "Ametralladora ligera"
  | "Fusil de combate"
  | "Escopeta"
  | "Pistola"
  | "Warzone Meta";

export interface WeaponStats {
  name: string;
  slug?: string;
  ttkShort: number; // Corto alcance (ms)
  ttkLong: number; // Largo alcance (ms)
  fireRate: number; // rpm
  damagePerMag: number;
  bulletVelocity: number; // m/s
  effectiveRange: number; // metros
  recoil: number; // °/s vertical o general
  adsTime: number; // ms
  moveSpeed: number; // m/s
  hipfireSpread: number; // °
  hitboxes: {
    distanceRanges: string[];
    head: number[];
    neck: number[];
    chest: number[];
    extremities: number[];
  };
}

export interface Attachment {
  slot: string;
  name: string;
}

export interface WeaponBuild {
  id: string;
  name: string;
  category?: WeaponCategory | string;
  tier?: string;
  rank?: string;
  buildType?: string;
  code?: string | null;
  image?: string;
  attachments: Attachment[];
  aliases?: string[];
}

export interface MetaRankedWeapon {
  name: string;
  slug: string;
  rank?: string;
  category?: string;
  status?: string;
}

// export interface WeaponBuild {
//   id: string;
//   name: string;
//   category:
//     | "AR"
//     | "SMG"
//     | "LMG"
//     | "Shotgun"
//     | "Marksman Rifle"
//     | "Sniper Rifle"
//     | "Pistol";
//   tier: "Meta absolute" | "Meta" | "Viable";
//   image?: string;
//   attachments: Attachment[];
// }

export const BLACKLIST = [
  "warzone",
  "meta",
  "ranking",
  "battle royale",
  "resurgimiento",
  "tier list",
  "temporada",
  "stats",
  "armas",
  "clases",
  "top",
];

export const BANNED_WEAPONS = [
  "RAM-7",
  "STRIKER",
  "SWAT 5.56",
  "KAR98K",
  "LW3A1 FROSTLINE",
  "LR 7.62",
  "FJX IMPERIUM",
];

export const ALLOWED_WEAPONS: string[] = [
  "AN-94",
  "RYDEN 45K",
  "MK35 ISR",
  "VST",
  "FG42",
  "MPC-25",
  "DS20 MIRAGE",
  "REV-46",
  "STRIDER 300",
  "VS RECON",
  "HAWKER HX",
  "AK-27",
  "CBRS-3",
  "VX COMPACT",
  "STURMWOLF 45",
  "VOYAK KT-3",
  "M15 MOD 0",
  "MXR-17",
  "PEACEKEEPER MK1",
  "CARBON 57",
  "X9 MAVERICK",
  "KOGOT-7",
  "EGRT-17",
  "SOKOL 545",
  "DRAVEC 45",
  "GREMLIN",
  "RAZOR 9MM",
  "MK.78",
  "MADDOX RFB",
  "XM325",
  "M8A1",
  "SWORDFISH A1",
  "XR-3 ION",
  "AKITA",
  "M10 BREACHER",
  "M34 NOVALINE",
  "WARDEN 308",
  "RK-9",
  "SG-12",
  "ECHO 12",
  "KRS-7.62",
  "VELOX 5.7",
  "1911",
  "CODA 9",
  "JÄGER 45",
  "SHADOW SK",
  "MAMMOTH",
  "SIREN",
  "A.R.C. M1",
  "FLATLINE MK.II",
  "AAROW 109",
  "KNIFE",
  "BALLISTIC KNIFE",
  "NX RAVAGER",
  "H311-SAW",
  "GDL HAVOC",
  "KATANA",
  "GRIMHAWK",
  "EXECUTIONER'S DUET",
  "MACE",
];

export const ALLOWED_WEAPONS_SET = new Set(
  ALLOWED_WEAPONS.map((name) => name.toLowerCase().replace(/[^a-z0-9]/g, "")),
);

export const FALLOUT_WEAPONS = [
  "AN-94",
  "FG42",
  "MK35 ISR",
  "DS20 MIRAGE",
  "AK-27",
  "REV-46",
  "RYDEN-45K",
  "VST",
  "MPC-25",
  "STRIDER-300",
  "VS-RECON",
  "HAWKER-HX",
];
