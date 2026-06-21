/**
 * @coongro/vademecum — Exportaciones server-only
 *
 * Contrato, registry y servicio del catálogo regulatorio. Sin schema ni DB: el
 * catálogo se cachea en memoria del proceso (ver CatalogService).
 *
 * Los plugins provider importan desde acá: registran su provider en
 * `providerRegistry` y construyen `new CatalogService(provider)`.
 */

export { providerRegistry } from './registry/provider-registry.js';
export type { ProviderRegistry } from './registry/provider-registry.js';
export { CatalogService } from './services/catalog.service.js';
export type { RegulatoryCatalogProvider } from './contracts/regulatory-catalog-provider.js';

// Modelo común (también disponible browser-safe desde el index).
export type {
  CatalogProductSummary,
  CatalogProductDetail,
  CatalogComposition,
  CatalogProductStatus,
  CatalogPage,
  CountryCode,
} from './types/catalog.js';
