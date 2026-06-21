import type { RegulatoryCatalogProvider } from '../contracts/regulatory-catalog-provider.js';
import type {
  CatalogProductDetail,
  CatalogProductKind,
  CatalogProductSummary,
} from '../types/catalog.js';

/** TTL del índice en memoria: pasado esto, la próxima búsqueda lo re-trae. */
const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

/**
 * Máximo de candidatos a clasificar por búsqueda cuando se filtra por `kind`.
 * El tipo (medicamento/vacuna) solo se sabe del detalle, así que clasificar
 * cuesta un fetch por candidato (cacheado). Se acota para no traer cientos de
 * detalles: con un término razonable alcanza de sobra para llenar el `limit`.
 */
const MAX_CLASSIFY = 30;

interface IndexEntry {
  items: CatalogProductSummary[];
  at: number;
}

/**
 * Servicio de catálogo regulatorio — agnóstico de fuente.
 *
 * Caché EN MEMORIA del proceso (no DB): el padrón es nacional e idéntico para
 * todos los tenants, así que una sola copia por proceso del API sirve a todos.
 * Es la opción más rápida y de menos código: la fuente no permite búsqueda por
 * texto server-side, así que se trae el índice liviano completo una vez (~1s,
 * ~3 MB) y se filtra en memoria; el detalle pesado se trae on-demand y se
 * cachea. Sin schema, sin migraciones, sin escrituras masivas.
 *
 * Los caches son `static` (compartidos por todas las instancias del módulo en
 * el proceso). Se instancia con el provider concreto:
 * `new CatalogService(new SenasaProvider())`.
 */
export class CatalogService {
  /** Índice liviano por provider (con timestamp para TTL). */
  private static readonly index = new Map<string, IndexEntry>();
  /** Carga en vuelo por provider — coalescing de búsquedas concurrentes. */
  private static readonly inflight = new Map<string, Promise<CatalogProductSummary[]>>();
  /** Fichas completas cacheadas por `${provider}:${sourceId}`. */
  private static readonly details = new Map<string, CatalogProductDetail>();

  constructor(private readonly provider: RegulatoryCatalogProvider) {}

  /**
   * Busca en el índice (en memoria) por nombre comercial, registro o
   * laboratorio. La primera búsqueda dispara el fetch único del índice; las
   * siguientes filtran lo ya cacheado (instantáneas).
   */
  async search({
    query,
    limit = 20,
    kind,
  }: {
    query: string;
    limit?: number;
    /** Si se pasa, devuelve solo productos de ese tipo (clasificando por detalle). */
    kind?: CatalogProductKind;
  }): Promise<CatalogProductSummary[]> {
    const term = query.trim().toLowerCase();
    if (!term) return [];

    const items = await this.getIndex();
    // Con filtro de tipo se juntan más candidatos (hasta MAX_CLASSIFY) porque
    // algunos se descartan al clasificar; sin filtro alcanza con `limit`.
    const cap = kind ? MAX_CLASSIFY : limit;
    const matches: CatalogProductSummary[] = [];
    for (const p of items) {
      if (
        p.commercialName.toLowerCase().includes(term) ||
        p.registrationNumber.toLowerCase().includes(term) ||
        (p.laboratory ?? '').toLowerCase().includes(term)
      ) {
        matches.push(p);
        if (matches.length >= cap) break;
      }
    }

    if (!kind) return matches;

    // Clasificar por tipo: el kind solo vive en el detalle, así que se traen los
    // detalles de los candidatos en paralelo (cacheados) y se filtra. De paso se
    // enriquece cada summary con las especies del detalle (sin fetch extra).
    const details = await Promise.all(
      matches.map((p) => this.getDetail({ sourceId: p.sourceId }).catch(() => null))
    );
    return matches
      .map((p, i) => ({ summary: p, detail: details[i] }))
      .filter((e) => e.detail?.kind === kind)
      .slice(0, limit)
      .map((e) => ({ ...e.summary, species: e.detail?.species }));
  }

  /** Ficha completa: de la caché en memoria o, si falta, del provider on-demand. */
  async getDetail({ sourceId }: { sourceId: string }): Promise<CatalogProductDetail | null> {
    const key = `${this.provider.id}:${sourceId}`;
    const cached = CatalogService.details.get(key);
    if (cached) return cached;

    const detail = await this.provider.fetchDetail(sourceId);
    if (detail) CatalogService.details.set(key, detail);
    return detail;
  }

  /** Devuelve el índice cacheado; lo trae (una vez) si falta o venció el TTL. */
  private async getIndex(): Promise<CatalogProductSummary[]> {
    const id = this.provider.id;
    const entry = CatalogService.index.get(id);
    if (entry && Date.now() - entry.at < INDEX_TTL_MS) return entry.items;

    // Coalescing: si ya hay un fetch en vuelo para esta fuente, reusarlo.
    const existing = CatalogService.inflight.get(id);
    if (existing !== undefined) return existing;

    const promise = this.provider
      .fetchIndex()
      .then((items) => {
        CatalogService.index.set(id, { items, at: Date.now() });
        return items;
      })
      .finally(() => {
        CatalogService.inflight.delete(id);
      });
    CatalogService.inflight.set(id, promise);
    return promise;
  }
}
