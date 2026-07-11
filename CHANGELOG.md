# @coongro/vademecum

## 0.2.0

### Minor Changes

- be13b3a: Buscador del catálogo regulatorio reutilizable (COONG-224): se construye la Fase D pendiente — `useCatalogSearch` (hook con query + debounce + gating por país) y `CatalogSearch` (componente UI self-contained, con su propio CSS y desacoplado de `usePlugin`, usando el toast del host). El autofill (detalle→form) queda en cada consumidor vía `onSelect`, de modo que Farmacia y Vacunación comparten el mismo buscador cambiando solo el `kind`. Además, `uuid()` con fallback para contextos inseguros (HTTP/LAN) en el alta de laboratorios del maestro compartido.
- 502301c: feat: maestro de laboratorios compartido (COONG-219)

  Agrega el maestro único de laboratorios en vademecum (el plugin neutral),
  consumible por Farmacia y Vacunación vía el repo `vademecum.laboratories`:

  - Tabla `module_vademecum_laboratories` (nombre + CUIT + nº de inscripción +
    país + origen) con su migración.
  - `LaboratoryRepository` (list/listActive/getById/create/update/softDelete +
    `ensureByName` para el auto-upsert desde el autofill regulatorio).
  - Hook `useLaboratories` y componentes `LaboratorySelect` / `LabFormDialog`
    reutilizables, exportados para los consumidores.
  - Vista de gestión "Laboratorios" con su ítem de menú.

### Patch Changes

- 11652af: refactor(COONG-225 #8/#2): adopta uuid() y toast del plugin-sdk

  Elimina dos workarounds que el SDK ahora resuelve de raíz:

  - `src/utils/uuid.ts` (uuid v4 con fallback `getRandomValues` para contexto
    inseguro) → se usa `uuid` de `@coongro/plugin-sdk` (fuente única; misma lógica).
  - El `hostToast` crudo (`window.coongro.toast.show`) de `CatalogSearch`, que se
    usaba a propósito porque `usePlugin().toast` requería contexto montado → ahora
    se usa el `toast` standalone del SDK (no requiere context). Buscador cross-plugin.

  Requiere `@coongro/plugin-sdk >=0.53.0` (versión que expone `uuid`/`toast`).
