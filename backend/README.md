# trigger CI

## Campo `sku_family` en SKUs
- El campo `family` de la tabla `skus` es un clasificador opcional pensado solo para consumibles (`consumible`, `papeleria`, `limpieza`).
- Hoy se usa de manera liviana para agrupar y filtrar consumibles en órdenes internas; no impacta reglas de stock ni producción.
- Debe mantenerse disponible para futuros flujos industriales (segmentación de consumibles, alertas específicas), aunque no se apliquen reglas adicionales todavía.
