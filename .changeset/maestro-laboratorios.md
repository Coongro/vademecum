---
"@coongro/vademecum": minor
---

feat: maestro de laboratorios compartido (COONG-219)

Agrega el maestro único de laboratorios en vademecum (el plugin neutral),
consumible por Farmacia y Vacunación vía el repo `vademecum.laboratories`:

- Tabla `module_vademecum_laboratories` (nombre + CUIT + nº de inscripción +
  país + origen) con su migración.
- `LaboratoryRepository` (list/listActive/getById/create/update/softDelete +
  `ensureByName` para el auto-upsert desde el autofill regulatorio).
- Hook `useLaboratories` y componentes `LaboratorySelect` / `LabFormDialog`
  reutilizables, exportados para los consumidores.
- Vista de gestión "Laboratorios" con su ítem de menú.
