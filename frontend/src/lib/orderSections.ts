import type { SKU } from "./api";

export type OrderSectionKey = "pt" | "consumibles" | "papeleria" | "limpieza";

export type OrderSectionConfig = {
  key: OrderSectionKey;
  title: string;
  filter: (sku: SKU) => boolean;
};

export const ORDER_SECTIONS: OrderSectionConfig[] = [
  {
    key: "pt",
    title: "Productos terminados",
    filter: (sku) => sku.sku_type_code === "PT" && sku.is_active,
  },
  {
    key: "consumibles",
    title: "Consumibles (depósito)",
    filter: (sku) => sku.sku_type_code === "CON" && sku.is_active,
  },
  {
    key: "papeleria",
    title: "Papelería",
    filter: (sku) => sku.sku_type_code === "PAP" && sku.is_active,
  },
  {
    key: "limpieza",
    title: "Limpieza",
    filter: (sku) => sku.sku_type_code === "LIM" && sku.is_active,
  },
];

export const sectionForSku = (sku?: SKU | null): OrderSectionKey => {
  if (!sku) return "consumibles";
  if (sku.sku_type_code === "PT") return "pt";
  if (sku.sku_type_code === "PAP") return "papeleria";
  if (sku.sku_type_code === "LIM") return "limpieza";
  return "consumibles";
};
