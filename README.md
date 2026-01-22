# FNC - Gestión de Producción, Stock y Remitos

Este repositorio contiene la documentación inicial para el sistema web de gestión de producción, stock, pedidos y remitos de FNC. Aún no se ha implementado código; este documento 
resume el relevamiento y propone próximos pasos para alinear alcance y arquitectura.

## Alcance resumido
- **Producción & Recetas:** alta/edición de productos, recetas con coeficientes de consumo y empaques, carga de producción con consumo automático de MP/SEMI, y BOMs para empaques.
- **Stocks (PT & MP):** entradas/salidas/ajustes, kardex por ítem, conteos físicos y conciliación.
- **Pedidos y Remitos:** pedidos internos por pantalla, bandeja de preparación, generación de remitos por destino con descuento de stock, exportación a PDF/Excel.
- **Materiales para Locales:** catálogo único por origen (depósito, limpieza, papelería, varios) con remitos semanales por local y formato contable actual.
- **Reportes:** producción, consumo de MP, distribución por cliente/canal, indicadores de eficiencia y exportaciones a PDF/Excel.
- **Seguridad & Administración:** usuarios/roles (Admin, Depósito, Producción, Ventas/Remitos, Auditoría) y bitácora de cambios.

## Procesos clave
- **Masa → SEMI → Empaquetado → PT:** trazabilidad por lote en cada etapa, con registro de responsables y mermas.
- **Pedidos y remitos:** flujo de pedidos por locales y supermercados (vía planta), validación interna, preparación de despacho y confirmación de recepción.
- **Inventarios:** frecuencia diferenciada (SEMI diaria; PT/MP semanal), conteo por empaque/peso y manejo de diferencias.
- **Mermas:** categorizadas por etapa (producción, empaque, stock, tránsito, administrativa) con causas preconfiguradas y asociación a lote cuando aplique.

## Arquitectura propuesta
- **Backend:** FastAPI
- **ORM/modelos:** SQLModel
- **Base de datos:** PostgreSQL
- **Frontend:** React + Vite
- **UI Framework:** Material UI

## Iteración 4 – Módulo de Mermas
- **Modelo y migraciones:**
  - Nuevas tablas `production_lines`, `merma_types`, `merma_causes`, `merma_events` y migración `20240720_0002_merma_module` (incluye `destination_deposit_id` y `notes` en pedidos). 【F:backend/alembic/versions/20240720_0002_merma_module.py†L1-L88】
  - Catálogos administrables por etapa con códigos estables (`code`) y etiquetas editables (`label`); no se permite eliminar si están en uso. 【F:backend/app/api/routes.py†L137-L215】【F:backend/app/api/routes.py†L317-L383】
  - Líneas de producción parametrizadas (`production_lines`) y obligatorias para mermas en etapa producción. 【F:backend/app/models/merma.py†L10-L34】【F:backend/app/api/routes.py†L98-L135】

- **Entidades nuevas (backend):**
  - `MermaEvent` con trazabilidad completa: etapa (`stage`), tipo y causa (código/etiqueta), SKU, cantidad/unidad, lote opcional, depósito, remito (para tránsito), pedido, línea de producción, responsable, notas, `detected_at`, acción (`discarded`, `reprocessed`, `admin_adjustment`, `none`), `affects_stock` y vínculo a movimiento de stock si corresponde. 【F:backend/app/models/merma.py†L36-L92】【F:backend/app/api/routes.py†L385-L472】
  - Se reutiliza `movement_type=MERMA` y se delega el ajuste de stock a `_apply_stock_movement` con permiso de saldo negativo para no bloquear registro de mermas. 【F:backend/app/api/routes.py†L63-L95】【F:backend/app/api/routes.py†L419-L448】

- **Reglas por etapa:**
  - Producción: requiere línea de producción, depósito y SKU; admite lote. 【F:backend/app/api/routes.py†L401-L413】
  - Empaque/Stock: depósito obligatorio. 【F:backend/app/api/routes.py†L413-L416】
  - Tránsito post-remito: remito obligatorio; el ajuste se aplica al depósito destino del pedido asociado. 【F:backend/app/api/routes.py†L416-L422】
  - Administrativa: notas obligatorias; depósito obligatorio sólo si afecta stock. 【F:backend/app/api/routes.py†L422-L426】

- **Catálogos semilla:** tipos y causas precargados por etapa según relevamiento (roturas, defectos, vencimiento, ajustes administrativos, etc.), más tres líneas de producción activas. 【F:backend/app/core/seed.py†L8-L82】【F:backend/app/core/seed.py†L103-L133】

- **API nueva:**
  - `GET/POST/PUT/DELETE /api/mermas/types` y `/api/mermas/causes` (filtro por etapa, desactivación). 【F:backend/app/api/routes.py†L137-L215】
  - `GET/POST /api/mermas` y `GET /api/mermas/{id}` con filtros por fecha, etapa, depósito, línea, SKU, tipo, causa y `affects_stock`. 【F:backend/app/api/routes.py†L385-L472】
  - `GET/POST/PUT /api/production-lines` para administrar líneas. 【F:backend/app/api/routes.py†L98-L135】

- **Frontend (React):**
  - Nueva pantalla `/mermas` con tres pestañas: Registro (campos dinámicos según etapa), Listado/Detalle con filtros completos y vínculo al movimiento de stock, y Catálogos (ABM de tipos, causas y líneas). 【F:frontend/src/pages/MermasPage.tsx†L1-L522】
  - Navegación actualizada para exponer el módulo desde el menú principal. 【F:frontend/src/shell/AppShell.tsx†L8-L18】【F:frontend/src/App.tsx†L6-L24】
  - Cliente API extendido con tipos, causas, eventos y líneas de producción. 【F:frontend/src/lib/api.ts†L5-L223】【F:frontend/src/lib/api.ts†L370-L531】

- **Decisiones documentadas:**
  - El ajuste de mermas en tránsito se aplica al depósito destino del pedido, preservando el remito. 【F:backend/app/api/routes.py†L416-L422】
  - Unidades: la merma captura `unit` (por defecto la del SKU) y permite packs/cajas según catálogo controlado. 【F:backend/app/models/merma.py†L52-L60】【F:frontend/src/pages/MermasPage.tsx†L215-L241】
  - Lógica de stock no duplicada: se reutiliza el motor de movimientos MERMA; `affects_stock=false` registra el evento sin tocar inventario. 【F:backend/app/api/routes.py†L63-L95】【F:backend/app/api/routes.py†L419-L448】
  - Para evitar bloqueos operativos, los movimientos MERMA permiten saldo negativo al registrarse desde el módulo de mermas. 【F:backend/app/api/routes.py†L63-L95】【F:backend/app/api/routes.py†L419-L448】

- **Cómo usar:**
  - Ejecutar migraciones (`alembic upgrade head`) o permitir `init_db` crear las tablas; el seed carga catálogos iniciales y líneas. 【F:backend/app/db.py†L7-L15】【F:backend/app/core/seed.py†L103-L133】
  - Crear/editar catálogos desde la pestaña “Catálogos” o vía API; desactivar en lugar de borrar si están en uso.
  - Registrar mermas desde la pestaña “Registro” seleccionando etapa y campos obligatorios; si `Afecta stock` está activado se genera movimiento MERMA y se muestra el ID en el listado/detalle.

## Setup técnico y convenciones

### Versiones requeridas
- **Python:** 3.11 (requerido para el backend)
- **Node.js:** 18+ (recomendado para el frontend)

> El proyecto incluye un archivo `.python-version` en la raíz del repositorio
> para fijar explícitamente la versión de Python utilizada en desarrollo.

### Convención de API
- El backend expone **todos los endpoints bajo el prefijo `/api`**.
- Ejemplo:
  - Health check: `GET http://localhost:8000/api/health`

El frontend **debe** consumir la API utilizando este prefijo.

### Configuración del frontend (desarrollo)
El frontend obtiene la URL base del backend desde una variable de entorno:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### Storage de PDFs (producción)
Para guardar los PDFs de remitos fuera del repositorio, defina la variable de entorno `STORAGE_ROOT` en el backend
(por ejemplo `/var/lib/fnc/storage`). El servicio escribirá los PDFs en `${STORAGE_ROOT}/remitos` y seguirá leyendo
los PDFs existentes en `backend/app/storage/remitos` como fallback de compatibilidad.


### Observaciones iniciales
- La pila propuesta es adecuada para una aplicación full web y responsive, con buen soporte para tablet y escritorio.
- SQLModel facilita tipado y modelos Pydantic; se sugiere definir convenciones tempranas para versiones de schema y migraciones (p.ej., Alembic).
- Para exportación PDF/Excel y reportes contables espejo, conviene normalizar layouts y fuentes de datos desde el inicio.

## Definiciones confirmadas
- **Lotes visibles sólo para depósito:** Los locales no necesitan ver ni seleccionar lotes en remitos; la gestión de lotes queda en depósito.
- **Stock en locales sin detalle de lotes:** Se manejarán cantidades totales por SKU en locales.
- **Pedidos con aprobación manual:** Todos los pedidos requieren aprobación manual por ahora.
- **Mermas en tránsito:** Se registrarán como ajustes de stock en depósito asociados al remito; no se generarán contramovimientos en el local salvo que se revise este flujo más 
adelante.
- **Reportes energéticos:** Se incorporarán en una fase posterior.
- **Autenticación:** Se usará autenticación interna; no se integrará proveedor externo ni 2FA en esta etapa.
- **Idiomas y formatos:** Español (Uruguay) en UI y exportes contables.
- **Conectividad:** No se requiere soporte offline ni caché especial.
- **Alertas y auditoría:** No se implementarán notificaciones por ahora.
- **Materiales para locales:** Sólo se controlarán cantidades, sin gestión de lote.

## Dudas previas (respondidas)
1. **Identificación de lotes visible al cliente:** respondido (locales no gestionan lote).
2. **Stock en locales:** respondido (cantidades por SKU sin lote).
3. **Flujo de aprobación de pedidos:** respondido (aprobación manual siempre).
4. **Manejo de mermas en tránsito:** respondido (ajuste en depósito, sin contramovimiento en local por ahora).
5. **Reportes energéticos:** respondido (fase posterior).
6. **Autenticación y accesos:** respondido (autenticación interna sin 2FA ni proveedor externo).
7. **Idiomas y formatos:** respondido (es-UY).
8. **Conectividad en planta/tablet:** respondido (no offline).
9. **Alertas y auditoría:** respondido (no notificaciones iniciales).
10. **Catálogo de materiales para locales:** respondido (sin control de lote, sólo cantidades).

## Próximos pasos sugeridos
1) **Alinear backlog y alcance corto (Paso 1)**
   - **Objetivo:** cerrar el MVP con lista priorizada y criterios de éxito aceptados por negocio.
   - **Backlog inicial por orden sugerido:**
     1. Registro de producción (masa → SEMI → PT) con consumo automático de MP/SEMI y trazabilidad por lote en depósito.
     2. Movimientos de stock y kardex (entradas, salidas, ajustes, mermas por etapa y remitos).
     3. Pedidos internos de locales con aprobación manual y preparación de remitos (PDF) con descuento de stock.
     4. Materiales para locales (limpieza/papelería/varios) con stock por cantidades y remitos consolidados.
     5. Reportes básicos: producción por período, consumo de MP, entregas por cliente/canal.
   - **Criterios de éxito del MVP:**
     - Remito PDF generado desde pedido aprobado y descontando stock del depósito.
     - Kardex por SKU con saldo coherente tras producción, mermas y remitos.
     - Producción registrada con lotes en depósito y mermas clasificadas por etapa.
     - Conteo físico semanal (PT/MP) y diario (SEMI) reflejado como ajustes en el stock.
   - **Salidas esperadas de Paso 1:** backlog priorizado, criterios de aceptación de MVP documentados y responsables definidos para aprobar cada ítem.

2) **Modelado de datos y migraciones**
   - **Objetivo:** contar con un modelo de datos consistente, versionado y listo para migraciones iniciales, alineado a los procesos levantados.
   - **Entidades núcleo a definir (con relaciones y cardinalidades):**
     - **SKU** (tipos PT, SEMI, MP, Consumibles/Materiales) con atributos de empaque, UoM, familia y reglas de SKU por anexo.
     - **Recetas/BOM** por SKU PT/SEMI, con coeficientes de consumo de MP/SEMI y empaques.
     - **Lotes** y numeración (masa, granel, PT), vinculados a consumos y producción.
     - **Depósitos** (fábrica, auxiliares, locales) y **stock por depósito** sin gestión de lote en locales.
     - **Movimientos de stock** (ingreso, consumo, merma, remito, ajuste) con kardex y opcional lote.
     - **Pedidos** (estado: borrador, enviado, aprobado, preparado) y **remitos** (PDF), asociados a depósito origen y destino.
     - **Usuarios/Roles** y bitácora de cambios (auditoría básica).
   - **Convenciones y estándares a acordar:**
     - Naming en BD (snake_case), timestamps y manejo de zonas horarias (UTC en base, TZ UI es-UY).
     - Estados enumerados para pedidos, remitos, mermas y tipos de movimiento.
     - Versionado de esquemas y seeds iniciales (Alembic + fixtures mínimas: roles, depósitos, SKUs base de ejemplo).
   - **Plan de migraciones y ambientes:**
     - Pipeline de migraciones con Alembic; ramas de features aplican migraciones en dev, luego stage/prod.
     - Datos iniciales mínimos para demo/MVP: depósitos, roles, SKUs PT/SEMI/MP representativos, reglas de lotes.
   - **Salidas esperadas de Paso 2:**
     - Diagrama entidad-relación compartido (puede ser texto + imagen enlazada) aprobado por stakeholders.
     - Archivo de convenciones (nombres, estados, timestamps) y listado de migraciones iniciales planificadas.
     - Lista de seeds mínimas validadas (roles, depósitos, SKUs ejemplo, usuarios iniciales).

3) **Flujos UI y UX**
   - Bosquejar pantallas clave por rol (producción en tablet, depósito/administración en escritorio) y navegación básica.
   - Definir layouts para reportes y exportes PDF/Excel espejo de planillas actuales.
   - Establecer validaciones mínimas (aprobación manual de pedidos, límites de mermas, obligatoriedad de lotes en depósito).

4) **Roadmap de entregas**
   - **Iteración 1 (MVP):** captura de producción con consumo automático, gestión de stock con kardex, pedidos internos, generación de remitos con exportación PDF, registro de mermas y 
ajustes en depósito.
   - **Iteración 2:** materiales para locales (limpieza/papelería/varios), exportes Excel, refinamiento de reportes productivos.
   - **Iteración 3:** indicadores adicionales (energéticos), mejoras de auditoría y trazabilidad avanzada.

5) **Definiciones técnicas previas al desarrollo**
   - Checklist de proyectos (monorepo sí/no, estructura de frontend y backend, configuraciones de Vite/FastAPI).
   - Estándares de autenticación interna, manejo de sesiones y logging/auditoría.
   - Estrategia de despliegue y CI para mantener sincronía entre backend y frontend.

Este documento sirve como base de alineación; no se ha agregado código ni estructura de proyecto aún.

## Estado para iniciar el desarrollo del MVP

- **Listo para empezar:**
  - Alcance de MVP priorizado y criterios de éxito definidos (remito PDF, kardex coherente, producción con lotes y mermas, conteos físicos registrados).
  - Decisiones clave cerradas: lotes sólo en depósito, stock por SKU en locales, pedidos con aprobación manual, sin soporte offline ni notificaciones.
  - Pila tecnológica acordada (FastAPI + SQLModel + PostgreSQL; React + Vite + MUI).
  - Convenciones preliminares de datos y plan de migraciones enumerados en Paso 2.

- **Pendientes mínimos antes de escribir código:**
  1) Validar y congelar el **ERD** propuesto (entidades núcleo y relaciones) y la lista inicial de **seeds** (roles, depósitos, SKUs ejemplo, usuarios).
  2) Aprobar el **archivo de convenciones** (nombres, estados, timestamps, zonas horarias) para evitar retrabajo en migraciones y API.

## Próximo paso inmediato (Iteración 2)

- **Backend:**
  - Generar endpoints CRUD iniciales para SKUs, depósitos y usuarios/roles con autenticación básica interna.
  - Exponer los primeros movimientos de stock (ingreso, consumo, merma) y un healthcheck con versión.
  - Preparar seeds mínimas (roles, depósitos y SKUs base) y una migración de referencia para ambientes dev/stage.
- **Frontend:**
  - Conectar el shell de React a un cliente API configurado por entorno (`VITE_API_BASE_URL`).
  - Añadir routing y un layout con navegación lateral (inicio, producción, stock, pedidos/remitos) y pantalla de login mock.
  - Crear vistas stub para: bandeja de pedidos, captura de producción y kardex, listas con datos dummy en tanto llega el backend.
  - **DevOps:**
  - Definir archivo `.env.example` para backend/frontend con las variables mínimas.
  - Documentar comandos de arranque rápido y decisión de ramas: `work` para desarrollo, `main` para estabilidad.

## Arranque rápido local (Iteración 2)

### Backend (FastAPI + SQLModel)
1. Copia y ajusta variables de entorno:
   ```bash
   cd backend
   cp .env.example .env  # Ajusta DATABASE_URL si usas otro Postgres
   ```
   - `LOAD_SEED=true` precarga roles, depósitos y SKUs de ejemplo al iniciar.
2. Instala dependencias y crea tablas:
   ```bash
   python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```
3. Endpoints disponibles (prefijo `/api` por defecto):
   - `GET /api/health` (incluye versión)
   - `GET /api/roles`
   - Catálogos: `GET /api/units` (unidades de medida normalizadas)
   - SKUs: `GET /api/skus`, `GET /api/skus/{id}`, `POST /api/skus`, `PUT /api/skus/{id}`, `DELETE /api/skus/{id}`
   - Depósitos: `GET /api/deposits`, `POST /api/deposits`, `PUT /api/deposits/{id}`, `DELETE /api/deposits/{id}`
   - Recetas: `GET /api/recipes`, `POST /api/recipes` (acepta componentes y cantidades)
   - Stock: `GET /api/stock-levels` (saldo consolidado), `POST /api/stock/movements` (ingresos, consumos, mermas, remitos)
   - Reportes: `GET /api/reports/stock-summary` (totales por tag, depósito y movimientos últimos 7 días)

### Frontend (React + Vite + MUI)
1. Configura el endpoint del backend:
   ```bash
   cd frontend
   cp .env.example .env  # VITE_API_BASE_URL=http://localhost:8000/api
   npm install
   npm run dev
   ```
2. Próximos pasos UI: añadir routing, pantalla de login mock y vistas stub para pedidos, producción y kardex.

### Catálogo de unidades de medida (cambio breaking)
- El atributo `unit` de SKUs ahora es un `enum` con catálogo controlado (`unit`, `kg`, `g`, `l`, `ml`, `pack`, `box`, `m`, `cm`).
- El frontend consume las unidades desde `GET /api/units`; no hay campos de texto libre para unidades.
- Si tienes datos previos, deberás migrar las unidades existentes al nuevo catálogo antes de levantar la app.

## Cómo subir tus cambios (incluye `package.json` y archivos nuevos como `App.tsx`)

1. Revisa qué modificaste y qué archivos nuevos tienes:
   ```bash
   git status
   ```
2. Añade todo lo que quieras subir (los archivos nuevos también se agregan con este paso):
   ```bash
   git add .
   ```
3. Crea el commit con un mensaje breve en español:
   ```bash
   git commit -m "Describe el cambio (por ejemplo: agrega routing y vistas stub)"
   ```
4. Sube la rama actual (`work` si sigues en esta) al remoto configurado:
   ```bash
   git push origin work
   ```
   Si ya configuraste el upstream (con `git push -u origin work` la primera vez), basta con:
   ```bash
   git push
   ```
5. Verifica en GitHub que se vea el commit y los archivos nuevos; si trabajas con Pull Requests, ábrelos desde la rama donde hiciste el push.

### Semillas mínimas incluidas
- Roles: `admin`, `deposito`, `produccion`.
- Depósitos: `Depósito Principal`, `Depósito MP`.
- SKUs ejemplo: `CUC-PT-24`, `CUC-GRANEL`, `MP-HARINA`.

## Pruebas recomendadas para validación interna
1. **Catálogo y unidades**
   - Crear un SKU con cada unidad del catálogo y validar que no se acepten valores fuera de la lista.
   - Editar un SKU existente cambiando la unidad y verificar la persistencia.
2. **Flujos de stock**
   - Registrar ingreso de MP en un depósito y verificar el saldo en `GET /api/stock-levels`.
   - Registrar producción de PT/SEMI y confirmar el incremento de stock.
   - Registrar merma/ajuste y validar que no se permita dejar saldo negativo.
3. **Recetas y producción**
   - Crear una receta con múltiples componentes y confirmar que se rechace si falta algún SKU.
   - Registrar producción desde la vista de Producción y revisar que aparezca en el reporte de movimientos.
4. **Modo móvil (tablet/smartphone)**
   - Abrir la app en una tablet/viewport < 1024px y confirmar que sólo se muestran producción, merma y pedidos/remitos.
   - Registrar producción y merma desde el modo móvil y validar el saldo actualizado en escritorio.
5. **Reportes**
   - Consultar `GET /api/reports/stock-summary` y revisar totales por tag y depósito.
   - Verificar que los movimientos de los últimos 7 días se reflejen en la tarjeta de movimientos.
6. **Smoke de UI**
   - Navegar en escritorio por Inicio, Producción, Stock, Pedidos y Reportes.
   - Validar que los formularios muestran mensajes de error ante campos obligatorios vacíos o API caída.

## Cómo publicar en tu nuevo repositorio de GitHub

1. Añade el remoto del nuevo repo (sólo la primera vez):
   ```bash
   git remote add origin git@github.com:uyfcastell/FNC-dev.git
   ```
   > Si prefieres HTTPS: `git remote add origin https://github.com/uyfcastell/FNC-dev.git`
2. Verifica el remoto configurado:
   ```bash
   git remote -v
   ```
3. Sube la rama actual (`work`) al nuevo origen y deja el upstream configurado:
   ```bash
   git push -u origin work
   ```
4. Para futuros pushes desde esta rama:
   ```bash
   git push
   ```

### Verificación del repo `FNC-dev`

Intenté consultar el estado del remoto `https://github.com/uyfcastell/FNC-dev.git` con `git ls-remote`, pero la conexión saliente fue bloqueada (HTTP 403). Desde este entorno no puedo 
confirmar si los últimos cambios ya están reflejados en GitHub; cuando tengas conectividad, ejecuta `git ls-remote origin` o abre el repo en el navegador para validar que la rama 
`work` esté publicada.

Con esto podrás compartir la Iteración 1 en el nuevo repositorio y continuar iterando sobre la misma rama o abrir ramas feature según convenga.
  3) Confirmar el **enfoque de ambientes** (dev/stage/prod) y la estrategia de despliegue/CI básica.

- **Recomendación:** Si estás conforme con los pendientes anteriores, puedo comenzar con la primera versión del esquema (Alembic + SQLModel) y la estructura base de frontend/backend. 
Si prefieres ajustar algo, indícalo antes de avanzar.

## Estructura de proyecto (MVP)

```
backend/
  app/
    core/config.py
    db.py
    main.py
    api/routes.py
    models/*.py
  alembic.ini
  alembic/
    env.py
    versions/20240717_0001_initial.py
frontend/
  package.json
  tsconfig.json
  vite.config.ts
  src/main.tsx
  src/shell/*
```

### Backend
- **Stack:** FastAPI + SQLModel + PostgreSQL + Alembic.
- **Modelos iniciales:** SKU (PT/SEMI/MP/CON), Recetas/BOM, Depósitos, StockLevels, Movimientos, Pedidos/Remitos, Roles/Usuarios.
- **Migración inicial:** `backend/alembic/versions/20240717_0001_initial.py` crea las tablas básicas y enums de estados.
- **Arranque rápido:**
  ```bash
  cd backend
  python -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  # Ajusta DATABASE_URL en .env si no usas el default local
  uvicorn app.main:app --reload
  # Alembic
  alembic upgrade head
  ```

### Frontend
 - **Stack:** React + Vite + TypeScript + Material UI.
  - **Shell inicial:** `AppShell` con layout base y tarjeta de onboarding (próximos pasos de iteración).
  - **Arranque rápido:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

## Dónde ejecutar `git push -u origin work`

Corre el comando desde la raíz del repositorio (la carpeta donde está este `README.md`). Un ejemplo con la ruta completa en el ambiente actual:

```bash
cd /workspace/FNC  # raíz del repo
git push -u origin work
```

Si tienes otra ruta local, ubica la carpeta que contiene `backend/`, `frontend/` y este `README.md` y ejecuta allí el push.

### Próximos pasos sugeridos
1. Ajustar/validar el ERD y completar seeds iniciales (roles, depósitos, SKUs ejemplo y usuarios).
2. Definir endpoints iniciales (producción, movimientos de stock, pedidos/remitos) y contratos de API.
3. Construir pantallas por rol: captura en tablet (producción/stock) y escritorio (pedidos/remitos/reportes).
Test CI check registration
