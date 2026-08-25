export interface Attachment {
  slot: string; // muzzle, barrel, optic
  name: string; // monolithic suppressor
}

export interface WeaponBuild {
  id: string;
  name: string;
  category:
    | "AR"
    | "SMG"
    | "LMG"
    | "Shotgun"
    | "Marksman Rifle"
    | "Sniper Rifle"
    | "Pistol";
  tier: "Meta absolute" | "Meta" | "Viable";
  image?: string;
  attachments: Attachment[];
}

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
