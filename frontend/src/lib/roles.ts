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

export const isLocalUser = (user?: User | null) => {
  if (!user?.role_name) return false;
  const normalized = normalizeRoleName(user.role_name);
  return ["ENCARGADO DE LOCALES", "LOCALES", "LOCAL"].includes(normalized);
};
