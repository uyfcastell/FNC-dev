import { User } from "./api";

const normalizeRoleName = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace("Á", "A")
    .replace("É", "E")
    .replace("Í", "I")
    .replace("Ó", "O")
    .replace("Ú", "U")
    .replace("Ü", "U")
    .replace("Ñ", "N");

export const CANONICAL_ROLE_NAMES = [
  "Administración",
  "Auditoría",
  "Encargado de Depósito",
  "Encargado de Locales",
  "Encargado de Planta",
  "Encargado de Reparto",
  "Encargado de Empaque",
  "Operario de Producción",
] as const;

const canonicalRoleSet = new Set(CANONICAL_ROLE_NAMES.map((role) => normalizeRoleName(role)));

export const isCanonicalRoleName = (roleName: string): boolean => canonicalRoleSet.has(normalizeRoleName(roleName));

export const isLocalUser = (user?: User | null) => {
  if (!user?.role_name) return false;
  const normalized = normalizeRoleName(user.role_name);
  return ["ENCARGADO DE LOCALES", "LOCALES", "LOCAL"].includes(normalized);
};
