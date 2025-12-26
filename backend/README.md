# trigger CI

## Campo `sku_family` en SKUs
- El campo `family` de la tabla `skus` es un clasificador opcional pensado solo para consumibles (`consumible`, `papeleria`, `limpieza`).
- Hoy se usa de manera liviana para agrupar y filtrar consumibles en órdenes internas; no impacta reglas de stock ni producción.
- Debe mantenerse disponible para futuros flujos industriales (segmentación de consumibles, alertas específicas), aunque no se apliquen reglas adicionales todavía.

## Iteración 09 — Auth + Remitos

### Endpoints nuevos / actualizados
- `POST /api/auth/login`: devuelve `access_token` JWT (`bearer`), expira según `JWT_EXPIRES_MINUTES`.
- `GET /api/auth/me`: perfil autenticado + rol.
- `GET /api/remitos`: listado.
- `GET /api/remitos/{id}`: detalle.
- `POST /api/remitos/from-order/{order_id}`: genera remito desde pedido.
- `POST /api/remitos/{id}/dispatch`: despacha con asignación FIFO de lotes (sin stock negativo).
- `POST /api/remitos/{id}/receive`: registra recepción (ingreso a depósito destino).
- `POST /api/remitos/{id}/cancel`: cancela si no fue despachado.

### Variables de entorno
- `JWT_SECRET` (obligatoria, no commitear).
- `JWT_EXPIRES_MINUTES` (opcional, default 720).

### Notas de seguridad
- Contraseñas nuevas se hashean con `bcrypt`. Durante login se acepta `sha256` legado y se rehashea a `bcrypt`.
- Roles activos: `ADMIN`, `WAREHOUSE`, `PRODUCTION`, `SALES`, `AUDIT` (se aceptan alias legacy `admin`, `deposito`, `produccion`).

### Verificación manual rápida
1) Exportar `JWT_SECRET` y levantar backend (`uvicorn app.main:app --reload`) y frontend (`npm run dev` en `frontend/`).
2) Crear usuario ADMIN vía `POST /api/users` y obtener token con `POST /api/auth/login`.
3) Crear un pedido (`POST /api/orders`) y luego `POST /api/remitos/from-order/{order_id}`.
4) Despachar el remito (`POST /api/remitos/{id}/dispatch`): stock baja; movimientos quedan con `reference_type=REMITO`.
5) Recibir el remito (`POST /api/remitos/{id}/receive`): stock ingresa en destino.
6) Desde el frontend, iniciar sesión con el usuario creado y validar la bandeja de remitos (crear/despachar/recibir).
