---
"@coongro/vademecum": patch
---

Limpieza del manifest: se quitan `menuSections`/`menuAssignments` y la sección de menú, dejando "Laboratorios" como ítem de menú normal. vademecum es un plugin común (maestro de laboratorios), no un kit; declarar una sección propia hacía que el View Builder lo clasificara mal como kit y le ensuciara el manifest (COONG-238).
