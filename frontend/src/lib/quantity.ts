const INTEGER_UNITS = new Set(["UNIT", "PACK", "BOX"]);

const sanitizeQuantityText = (inputText: string): string => inputText.trim().replace(/,/g, ".");

export const parseQuantityInput = (inputText: string): number | null => {
  const sanitized = sanitizeQuantityText(inputText);
  if (!sanitized) return null;
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const shouldUseIntegerQuantity = (unit?: string | null): boolean => {
  if (!unit) return false;
  return INTEGER_UNITS.has(unit.toUpperCase());
};

const toNormalizedString = (value: number, decimals: number): string => {
  if (decimals <= 0) return String(value);
  return value.toFixed(decimals);
};

export const normalizeQuantity = (unit: string | null | undefined, inputText: string): string => {
  const parsed = parseQuantityInput(inputText);
  if (parsed === null) return "";
  if (shouldUseIntegerQuantity(unit) && !Number.isInteger(parsed)) return "";
  const decimals = shouldUseIntegerQuantity(unit) ? 0 : 2;
  return toNormalizedString(parsed, decimals);
};
