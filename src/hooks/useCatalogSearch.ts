import { getHostReact, actions } from '@coongro/plugin-sdk';

import type {
  CatalogProductDetail,
  CatalogProductKind,
  CatalogProductSummary,
} from '../types/catalog.js';

const React = getHostReact();
const { useState, useEffect, useCallback } = React;

/**
 * Debounce local de un string. Se implementa con `setTimeout` en vez de usar el
 * `useDebounce` del host UI a propósito: este hook es server-agnóstico y vive en
 * un `.ts` (sin JSX), donde el tipo de `getHostUI()` no resuelve. Mantenerlo
 * autónomo evita acoplarlo a la UI del host.
 */
function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export interface UseCatalogSearchOptions {
  /**
   * Filtra el catálogo por tipo de producto: Farmacia pasa `'medication'`,
   * Vacunación `'vaccine'`. Sin `kind`, el buscador devuelve todo. El backend
   * clasifica por composición (ver CatalogService.search), así que el filtro es
   * agnóstico de fuente.
   */
  kind?: CatalogProductKind;
  /** Máximo de resultados por búsqueda (default 12). */
  limit?: number;
  /** Debounce del input antes de pegarle al catálogo (default 350 ms). */
  debounceMs?: number;
}

export interface UseCatalogSearchResult {
  query: string;
  setQuery: (q: string) => void;
  results: CatalogProductSummary[];
  loading: boolean;
  /**
   * Disponibilidad del vademécum en el tenant (gating por país):
   * - `null`  desconocido (aún no se buscó / sin error);
   * - `false` NINGÚN provider instalado lo cubre (país sin vademécum) → carga manual;
   * - `true`  hay provider (aunque una consulta puntual falle por red/sesión).
   */
  available: boolean | null;
  /**
   * Error recuperable de la última búsqueda (red, sesión vencida, ventana de
   * activación del loader), distinto de "no disponible en el país". `null` si no
   * hubo error.
   */
  error: string | null;
  /** Trae la ficha completa de un producto por sourceId (cacheada en el backend). */
  fetchDetail: (sourceId: string) => Promise<CatalogProductDetail | null>;
  /** Limpia query y resultados (ej. tras elegir un producto). */
  reset: () => void;
}

/**
 * Mecánica reutilizable de búsqueda en el catálogo regulatorio (COONG-224).
 *
 * Encapsula query + debounce + búsqueda con filtro por `kind` + gating por país,
 * hablando con el provider por RPC (`vademecum.catalog.search` / `.getDetail`).
 * No conoce la fuente concreta ni el formulario del consumidor: devuelve el
 * modelo común y deja que cada consumidor (vet-pharmacy, vaccination) mapee el
 * detalle a su propio form. Lo usa el componente `CatalogSearch`, pero también
 * se puede consumir solo para armar un buscador a medida.
 */
export function useCatalogSearch(options: UseCatalogSearchOptions = {}): UseCatalogSearchResult {
  const { kind, limit = 12, debounceMs = 350 } = options;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const debounced = useDebouncedValue(query, debounceMs);

  useEffect(() => {
    const q = debounced.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const res = await actions.execute<CatalogProductSummary[]>('vademecum.catalog.search', {
          query: q,
          limit,
          ...(kind ? { kind } : {}),
        });
        if (!active) return;
        setAvailable(true);
        setError(null);
        setResults(res ?? []);
      } catch (err) {
        if (!active) return;
        // Solo el mensaje definitivo "ningún plugin instalado lo registra" es país
        // sin provider. Lo demás (sesión vencida, red, ventana de activación del
        // loader) es recuperable → no mentir con "no disponible en el país".
        const msg = err instanceof Error ? err.message : '';
        const providerMissing = /not registered by any installed plugin/i.test(msg);
        setAvailable(!providerMissing);
        setError(
          providerMissing ? null : 'No se pudo consultar el vademécum. Reintentá en un momento.'
        );
        setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [debounced, kind, limit]);

  const fetchDetail = useCallback(
    (sourceId: string): Promise<CatalogProductDetail | null> =>
      actions.execute<CatalogProductDetail | null>('vademecum.catalog.getDetail', { sourceId }),
    []
  );

  const reset = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return { query, setQuery, results, loading, available, error, fetchDetail, reset };
}
