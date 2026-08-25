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

export const BANNED_WEAPONS = ["ram-7", "striker"];
