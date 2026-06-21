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

// Componentes y hooks de UI reutilizables: se exportarán en la Fase D
// (CatalogSearch, CompositionList, SourceBadge, useCatalogSearch).
