/**
 * Contrato que implementa cada fuente regulatoria (SENASA, SAG, MAPA…).
 *
 * El plugin reutilizable (vademecum) define este contrato; los plugins provider
 * lo implementan. El servicio y los consumidores trabajan solo contra esta
 * interfaz — nunca conocen la fuente concreta. Agregar Chile/Brasil mañana =
 * nuevo provider, sin tocar el reutilizable ni los consumidores.
 */

import type { CatalogProductDetail, CatalogProductSummary, CountryCode } from '../types/catalog.js';

export interface RegulatoryCatalogProvider {
  /** Identificador único del provider (ej. "senasa"). */
  readonly id: string;
  /** País/región que cubre (ej. "AR"). Se usa para el gating por tenant. */
  readonly country: CountryCode;
  /** Nombre legible de la fuente, para los badges "✓ desde SENASA". */
  readonly label: string;

  /**
   * Trae el índice liviano COMPLETO del padrón en una sola pasada (la fuente no
   * ofrece búsqueda por texto server-side; el filtrado se hace local). Debe ser
   * una operación corta — el padrón liviano es chico (SENASA: ~6.9k items,
   * ~3 MB, ~1s en una request). El servicio lo cachea en memoria con TTL.
   */
  fetchIndex(): Promise<CatalogProductSummary[]>;

  /**
   * Trae la ficha completa de un producto por su sourceId. La invoca el servicio
   * por demanda (al elegir un producto) y cachea el resultado. Devuelve null si
   * la fuente no tiene ese producto.
   */
  fetchDetail(sourceId: string): Promise<CatalogProductDetail | null>;
}
