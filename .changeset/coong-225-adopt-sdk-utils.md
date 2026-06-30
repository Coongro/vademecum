---
'@coongro/vademecum': patch
---

refactor(COONG-225 #8/#2): adopta uuid() y toast del plugin-sdk

Elimina dos workarounds que el SDK ahora resuelve de raíz:

- `src/utils/uuid.ts` (uuid v4 con fallback `getRandomValues` para contexto
  inseguro) → se usa `uuid` de `@coongro/plugin-sdk` (fuente única; misma lógica).
- El `hostToast` crudo (`window.coongro.toast.show`) de `CatalogSearch`, que se
  usaba a propósito porque `usePlugin().toast` requería contexto montado → ahora
  se usa el `toast` standalone del SDK (no requiere context). Buscador cross-plugin.

Requiere `@coongro/plugin-sdk >=0.53.0` (versión que expone `uuid`/`toast`).
