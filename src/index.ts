/**
 * @coongro/vademecum — Entry point principal (browser-safe)
 *
 * Exporta tipos del modelo común, el contrato y (Fase D) los componentes/hooks
 * de UI reutilizables. NO exporta schema tables, registry ni servicios — esos
 * usan drizzle-orm y van en '@coongro/vademecum/server'.
 */

// Modelo común — type-only, seguro para el browser.
export type {
  CatalogProductSummary,
  CatalogProductDetail,
  CatalogComposition,
  CatalogProductStatus,
  CatalogProductKind,
  CatalogPage,
  CountryCode,
} from './types/catalog.js';

// Contrato del provider — type-only (lo implementan los plugins provider).
export type { RegulatoryCatalogProvider } from './contracts/regulatory-catalog-provider.js';

// Maestro de laboratorios compartido (COONG-219) — lo consumen vet-pharmacy y
// vaccination. El selector y el hook son la API pública para los formularios; el
// row es type-only (el schema/repo viven en '@coongro/vademecum/server').
export { LaboratorySelect } from './components/LaboratorySelect.js';
export { LabFormDialog } from './components/LabFormDialog.js';
export type { LabFormValues } from './components/LabFormDialog.js';
export { useLaboratories } from './hooks/useLaboratories.js';
export type { UseLaboratoriesResult, CreateLaboratoryInput } from './hooks/useLaboratories.js';
export type { LaboratoryRow, NewLaboratoryRow } from './schema/laboratory.js';

// Componentes y hooks de UI reutilizables del catálogo regulatorio: se
// exportarán en la Fase D (CatalogSearch, CompositionList, SourceBadge,
// useCatalogSearch).
