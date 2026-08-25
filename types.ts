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
