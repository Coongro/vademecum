---
"@coongro/vademecum": minor
---

Buscador del catálogo regulatorio reutilizable (COONG-224): se construye la Fase D pendiente — `useCatalogSearch` (hook con query + debounce + gating por país) y `CatalogSearch` (componente UI self-contained, con su propio CSS y desacoplado de `usePlugin`, usando el toast del host). El autofill (detalle→form) queda en cada consumidor vía `onSelect`, de modo que Farmacia y Vacunación comparten el mismo buscador cambiando solo el `kind`. Además, `uuid()` con fallback para contextos inseguros (HTTP/LAN) en el alta de laboratorios del maestro compartido.
