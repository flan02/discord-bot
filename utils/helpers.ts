import { WeaponStats } from "@/services/stats";

export function findWeaponInMap(
  input: string,
  statsMap: Map<string, WeaponStats>,
): WeaponStats | undefined {
  const cleanInput = input.toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. Coincidencia directa por clave normalizada
  if (statsMap.has(cleanInput)) {
    return statsMap.get(cleanInput);
  }

  // 2. Coincidencia por nombre exacto normalizado
  for (const weapon of statsMap.values()) {
    const cleanName = weapon.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanName === cleanInput) return weapon;
  }

  // 3. Coincidencia parcial (empieza con...)
  for (const [key, weapon] of statsMap.entries()) {
    if (key.startsWith(cleanInput) || cleanInput.startsWith(key)) {
      return weapon;
    }
  }

  // 4. Coincidencia por inclusión segura
  for (const [key, weapon] of statsMap.entries()) {
    if (key.includes(cleanInput)) return weapon;
  }

  return undefined;
}
