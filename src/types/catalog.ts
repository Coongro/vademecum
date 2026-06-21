/**
 * Modelo común del catálogo regulatorio — agnóstico de la fuente.
 *
 * Cada provider (SENASA hoy; SAG/MAPA a futuro) mapea su DTO propio a estos
 * tipos. Los consumidores (vet-pharmacy, vaccination) trabajan SOLO contra
 * este modelo, nunca contra el DTO crudo de una fuente.
 */

/** ISO 3166-1 alpha-2 del país que cubre una fuente (ej. "AR"). */
export type CountryCode = string;

/**
 * Item liviano del índice del padrón — lo que se sincroniza a la caché y se
 * muestra en el dropdown de búsqueda. Intencionalmente mínimo: el detalle
 * pesado se trae por demanda (ver CatalogProductDetail).
 */
export interface CatalogProductSummary {
  /**
   * ID estable del producto DENTRO de la fuente. Es la clave para pedir el
   * detalle. En SENASA es el numeroInscripcion (ej. "X-017").
   */
  sourceId: string;
  /** Código de registro regulatorio mostrado al usuario (en AR == sourceId). */
  registrationNumber: string;
  /** Nombre comercial del producto. */
  commercialName: string;
  /** Laboratorio / firma titular (puede faltar en el índice liviano). */
  laboratory?: string;
  /** Id del provider que lo proveyó (ej. "senasa"). */
  source: string;
  /**
   * Especies destino. El índice no las trae, pero `search` las completa cuando
   * clasifica por tipo (ya tiene el detalle a mano) — así el dropdown puede
   * mostrarlas sin un fetch extra. undefined si la búsqueda no clasificó.
   */
  species?: string[];
}

/**
 * Un principio activo dentro de la composición. Los combinados producen varios
 * (ej. amoxicilina + ácido clavulánico → 2 items).
 *
 * `amount`/`unit` son best-effort: muchas fichas viejas de SENASA traen la
 * cantidad sin unidad explícita, por eso son opcionales y se conserva el texto
 * crudo en `rawStrength` para no perder información.
 */
export interface CatalogComposition {
  /** Nombre canónico de la sustancia, tal como lo da la fuente. */
  substance: string;
  /** Cantidad/concentración numérica si se pudo parsear. */
  amount?: number;
  /** Unidad (mg, ml, %, UI…) si se pudo parsear. */
  unit?: string;
  /** Concentración textual cruda de la fuente (ej. "100 mg/ml", "1.00"). */
  rawStrength?: string;
}

/**
 * Vigencia del producto en el padrón. La fuente da un texto libre
 * (estadoProducto.descripcion); se normaliza a este enum, conservando el texto
 * original en CatalogProductDetail.statusLabel para mostrarlo tal cual.
 */
export type CatalogProductStatus = 'active' | 'discontinued' | 'unknown';

/**
 * Naturaleza del producto, derivada de su composición (la fuente no la expone
 * como campo): los biológicos/vacunas se componen de agentes etiológicos /
 * antígenos; los medicamentos, de principios activos. Permite que cada consumidor
 * filtre lo suyo — Farmacia los medicamentos, Vacunación las vacunas.
 */
export type CatalogProductKind = 'medication' | 'vaccine' | 'other';

/**
 * Ficha completa normalizada — se trae por demanda al elegir un producto y se
 * cachea. Extiende el summary con todo lo que autocompleta el alta.
 */
export interface CatalogProductDetail extends CatalogProductSummary {
  /** CUIT / tax id del laboratorio, si la fuente lo expone. */
  laboratoryTaxId?: string;
  /** Naturaleza del producto (medicamento vs vacuna/biológico), según composición. */
  kind: CatalogProductKind;
  /** Composición: lista de principios activos (soporta combinados). */
  composition: CatalogComposition[];
  /** Vías de administración (ej. "Oral", "Inyectable"). */
  administrationRoutes: string[];
  /** Especies destino (ej. "Bovinos", "Caninos"). */
  species: string[];
  /** Indicaciones / acción terapéutica (texto libre de la fuente). */
  indications?: string;
  /** Presentación / envase, texto compuesto para mostrar (ej. "Frasco x 100 ml"). */
  presentation?: string;
  /**
   * Tipo de presentación crudo de la fuente (ej. "ESTÉRIL - LÍQUIDO - SUSPENSIÓN").
   * El consumidor lo mapea a su propio catálogo de tipos.
   */
  presentationType?: string;
  /** Capacidad/tamaño del envase como texto (ej. "100"). */
  presentationSize?: string;
  /** Clasificación / tipo de producto de la fuente. */
  classification?: string;
  /** Vigencia normalizada. */
  status: CatalogProductStatus;
  /** Texto crudo de vigencia de la fuente (ej. "ACTIVO", "DADO DE BAJA"). */
  statusLabel?: string;
}

/** Página de resultados (búsqueda en caché o fetch del padrón). */
export interface CatalogPage<T> {
  items: T[];
  /** Total de elementos disponibles en la fuente/caché para esa consulta. */
  total: number;
}
