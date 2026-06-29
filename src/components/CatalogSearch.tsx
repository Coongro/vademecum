import { getHostReact, getHostUI, toast } from '@coongro/plugin-sdk';

import { useCatalogSearch } from '../hooks/useCatalogSearch.js';
import type {
  CatalogProductDetail,
  CatalogProductKind,
  CatalogProductSummary,
} from '../types/catalog.js';

const UI = getHostUI();
const React = getHostReact();
const { useState, useEffect, useRef } = React;
const h = React.createElement;

export interface CatalogSearchProps {
  /**
   * Tipo de producto a buscar: Farmacia `'medication'`, Vacunación `'vaccine'`.
   * Sin `kind`, busca todo. El backend filtra por composición.
   */
  kind?: CatalogProductKind;
  /**
   * Producto elegido (controlado por el consumidor). Mientras esté seteado, el
   * buscador muestra la tarjeta "seleccionado" en vez del input. El consumidor lo
   * guarda porque suele necesitarlo para badges "Completado desde X" en su form.
   */
  selected?: CatalogProductDetail | null;
  /**
   * Se invoca al elegir un producto del dropdown, ya con la ficha completa
   * resuelta. El consumidor la mapea a su propio formulario (el autofill vive en
   * el consumidor porque cada uno mapea distinto: medicamento vs vacuna).
   */
  onSelect: (detail: CatalogProductDetail) => void;
  /** Se invoca al pulsar "Cambiar" sobre el producto elegido. */
  onClear?: () => void;
  /**
   * Modo carga manual (sin buscador): controlado para que el consumidor sepa que
   * el alta es manual y muestre/oculte sus badges en consecuencia.
   */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Título del recuadro (ej. "Buscar en el vademécum de SENASA"). */
  title?: string;
  /** Subtítulo explicativo bajo el título. */
  subtitle?: string;
  /** Placeholder del input de búsqueda. */
  placeholder?: string;
  /** Ícono Lucide de cada opción del dropdown (ej. 'Pill' meds, 'Syringe' vacunas). */
  itemIcon?: string;
  /**
   * Texto secundario (meta) de cada opción del dropdown. Por defecto el
   * laboratorio; el consumidor puede enriquecerlo (ej. agregando especies, que
   * cada plugin formatea a su manera).
   */
  renderItemMeta?: (item: CatalogProductSummary) => string;
  /** Máximo de resultados por búsqueda (default 12). */
  limit?: number;
}

/**
 * CSS self-contained del buscador, inyectado una vez por instancia. Se usa CSS
 * propio (clases con prefijo `cg-cs-`) en vez de Tailwind o el CSS del consumidor
 * a propósito: un componente cross-plugin no puede depender de que el CSS de otro
 * plugin esté cargado, y las utilities de Tailwind de distintos plugins colisionan
 * en la cascada. Los colores salen de los tokens globales `--cg-*`, así que respeta
 * el tema (claro/oscuro) sin hardcodear hex.
 */
const STYLE = `
.cg-cs-wrap{position:relative;background:var(--cg-neutral-100);border:.5px solid var(--cg-neutral-300);border-radius:12px;padding:16px}
.cg-cs-head{display:flex;gap:11px;align-items:flex-start;margin-bottom:12px}
.cg-cs-ico{width:32px;height:32px;border-radius:9px;flex-shrink:0;background:var(--cg-neutral-950);color:var(--cg-white);display:inline-flex;align-items:center;justify-content:center}
.cg-cs-title{font-family:var(--cg-font-body);font-weight:700;font-size:13.5px;color:var(--cg-neutral-950);letter-spacing:-.2px}
.cg-cs-sub{font-family:var(--cg-font-body);font-size:11.5px;color:var(--cg-neutral-700);margin-top:2px;line-height:1.45}
.cg-cs-input-wrap{position:relative}
.cg-cs-search-ico{position:absolute;top:50%;left:12px;transform:translateY(-50%);color:var(--cg-neutral-500);pointer-events:none;display:inline-flex;z-index:1}
.cg-cs-menu{margin-top:6px;background:var(--cg-white);border:.5px solid var(--cg-neutral-300);border-radius:10px;box-shadow:var(--cg-shadow-lg);overflow:hidden;max-height:252px;overflow-y:auto}
.cg-cs-opt{display:flex;align-items:center;gap:11px;width:100%;text-align:left;padding:11px 13px;border:none;background:transparent;cursor:pointer;position:relative}
.cg-cs-opt:not(:last-child)::after{content:'';position:absolute;left:13px;right:13px;bottom:0;height:.5px;background:var(--cg-neutral-200)}
.cg-cs-opt:hover{background:var(--cg-neutral-100)}
.cg-cs-opt-ico{width:30px;height:30px;border-radius:8px;flex-shrink:0;background:var(--cg-neutral-200);color:var(--cg-neutral-700);display:inline-flex;align-items:center;justify-content:center}
.cg-cs-opt-main{display:flex;flex-direction:column;min-width:0;flex:1}
.cg-cs-opt-name{font-family:var(--cg-font-body);font-weight:500;font-size:13.5px;color:var(--cg-neutral-950)}
.cg-cs-opt-meta{font-family:var(--cg-font-body);font-size:11.5px;color:var(--cg-neutral-700);margin-top:1px}
.cg-cs-opt-reg{font-family:'SF Mono','Menlo',monospace;font-size:11px;color:var(--cg-neutral-500);white-space:nowrap;flex-shrink:0}
.cg-cs-loading{display:flex;align-items:center;gap:9px;padding:14px 13px;font-size:12.5px;color:var(--cg-neutral-700)}
.cg-cs-spinner{width:14px;height:14px;border-radius:50%;border:2px solid var(--cg-neutral-300);border-top-color:var(--cg-neutral-950);animation:cg-cs-spin .7s linear infinite;display:inline-block;flex-shrink:0}
@keyframes cg-cs-spin{to{transform:rotate(360deg)}}
.cg-cs-empty{padding:16px 14px;display:flex;flex-direction:column;align-items:flex-start;gap:11px}
.cg-cs-empty-t{font-family:var(--cg-font-body);font-size:13px;color:var(--cg-neutral-950);font-weight:500}
.cg-cs-hint{font-family:var(--cg-font-body);font-size:11.5px;color:var(--cg-neutral-700)}
.cg-cs-manual-link{background:none;border:none;cursor:pointer;padding:9px 0 0;font-size:11.5px;color:var(--cg-neutral-700);text-decoration:underline;font-family:var(--cg-font-body)}
.cg-cs-manual-link:hover{color:var(--cg-neutral-950)}
.cg-cs-collapsed{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--cg-neutral-100);border:.5px dashed var(--cg-neutral-300);border-radius:10px;padding:11px 14px;font-size:12px;color:var(--cg-neutral-700)}
.cg-cs-collapsed>span{display:inline-flex;align-items:center;gap:7px}
.cg-cs-selected{display:flex;align-items:center;gap:11px;background:var(--cg-teal-soft);border:.5px solid var(--cg-teal-lt);border-radius:12px;padding:13px 15px}
.cg-cs-check{width:28px;height:28px;border-radius:50%;flex-shrink:0;background:var(--cg-teal-dk);color:var(--cg-white);display:inline-flex;align-items:center;justify-content:center}
.cg-cs-sel-text{min-width:0;flex:1}
.cg-cs-sel-name{font-family:var(--cg-font-body);font-weight:700;font-size:13.5px;color:var(--cg-teal-deep)}
.cg-cs-sel-meta{font-family:var(--cg-font-body);font-size:11.5px;color:var(--cg-teal-dk);margin-top:1px}
.cg-cs-change{background:none;border:none;cursor:pointer;font-size:11.5px;color:var(--cg-teal-deep);text-decoration:underline;font-family:var(--cg-font-body);font-weight:500;flex-shrink:0}
`;

/**
 * Buscador + autofill del catálogo regulatorio, REUTILIZABLE (COONG-224).
 *
 * Extraído del alta de medicamentos de vet-pharmacy para que Farmacia y
 * Vacunación compartan el mismo buscador: cambia el `kind` (y los textos/ícono),
 * no la mecánica. Encapsula búsqueda (vía `useCatalogSearch`), dropdown con
 * estados (cargando / sin resultados / error / no disponible en el país), la
 * tarjeta del producto elegido con su vigencia, y el fallback de carga manual.
 *
 * No toca el formulario del consumidor: al elegir un producto emite la ficha
 * completa por `onSelect` y el consumidor decide cómo prellenar sus campos (el
 * autofill difiere entre medicamento —principio activo— y vacuna —agente
 * etiológico—). Self-contained: estilos propios (ver STYLE), sin dependencias de
 * CSS del consumidor.
 */
export function CatalogSearch(props: CatalogSearchProps) {
  const {
    kind,
    selected = null,
    onSelect,
    onClear,
    collapsed = false,
    onCollapsedChange,
    title = 'Buscar en el vademécum',
    subtitle = 'Buscá por nombre comercial o componente y completamos casi toda la ficha.',
    placeholder = 'Buscar por nombre comercial o componente...',
    itemIcon = 'Pill',
    renderItemMeta,
    limit = 12,
  } = props;

  const { query, setQuery, results, loading, available, error, fetchDetail, reset } =
    useCatalogSearch({ kind, limit });

  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);

  // Cerrar el dropdown al clickear fuera del buscador + marcar desmontaje (para no
  // tocar estado ni emitir onSelect si el diálogo se cierra mientras se trae la ficha).
  useEffect(() => {
    mountedRef.current = true;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => {
      mountedRef.current = false;
      document.removeEventListener('mousedown', onDoc);
    };
  }, []);

  const pick = async (summary: CatalogProductSummary) => {
    setOpen(false);
    setPicking(true);
    try {
      const detail = await fetchDetail(summary.sourceId);
      if (!mountedRef.current) return;
      if (!detail) {
        // Un producto que estaba en el dropdown y de golpe no tiene ficha NO es
        // normal (race / inconsistencia del backend): es error, no un "aviso".
        toast.error('No se pudo traer la ficha', 'Reintentá o cargá el producto manualmente.');
        return;
      }
      onSelect(detail);
      reset();
    } catch (err) {
      if (mountedRef.current)
        toast.error('Error', err instanceof Error ? err.message : 'No se pudo traer el detalle');
    } finally {
      if (mountedRef.current) setPicking(false);
    }
  };

  const itemMeta = (item: CatalogProductSummary): string =>
    renderItemMeta ? renderItemMeta(item) : (item.laboratory ?? '—');

  // ── Vista: producto elegido ────────────────────────────────────────────────
  function renderSelected(detail: CatalogProductDetail) {
    return h(
      'div',
      { className: 'cg-cs-selected' },
      h('span', { className: 'cg-cs-check' }, h(UI.DynamicIcon, { icon: 'Check', size: 15 })),
      h(
        'div',
        { className: 'cg-cs-sel-text' },
        h('div', { className: 'cg-cs-sel-name' }, detail.commercialName),
        h(
          'div',
          { className: 'cg-cs-sel-meta' },
          `${detail.laboratory ?? '—'} · Reg. ${detail.registrationNumber}`
        )
      ),
      detail.status === 'discontinued'
        ? h(
            UI.Badge,
            { variant: 'warning-soft', style: { marginLeft: 'auto' } },
            detail.statusLabel ?? 'Dado de baja'
          )
        : h(UI.Badge, { variant: 'success-soft', style: { marginLeft: 'auto' } }, 'Vigente'),
      onClear
        ? h('button', { type: 'button', className: 'cg-cs-change', onClick: onClear }, 'Cambiar')
        : null
    );
  }

  // ── Vista: carga manual (colapsado) ────────────────────────────────────────
  function renderCollapsed() {
    return h(
      'div',
      { className: 'cg-cs-collapsed' },
      h(
        'span',
        null,
        h(UI.DynamicIcon, { icon: 'ShieldCheck', size: 14 }),
        'Carga manual — sin vademécum.'
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'cg-cs-change',
          onClick: () => onCollapsedChange?.(false),
        },
        'Buscar en el vademécum'
      )
    );
  }

  // ── Vista: dropdown de resultados ──────────────────────────────────────────
  function renderMenu() {
    if (loading || picking) {
      return h(
        'div',
        { className: 'cg-cs-loading' },
        h('span', { className: 'cg-cs-spinner' }),
        'Buscando en el vademécum…'
      );
    }
    if (available === false) {
      return h(
        'div',
        { className: 'cg-cs-empty' },
        h('div', { className: 'cg-cs-empty-t' }, 'El vademécum no está disponible en este país'),
        h('span', { className: 'cg-cs-hint' }, 'Cargá el producto manualmente abajo.')
      );
    }
    if (error) {
      return h(
        'div',
        { className: 'cg-cs-empty' },
        h('div', { className: 'cg-cs-empty-t' }, error),
        h('span', { className: 'cg-cs-hint' }, 'O cargá el producto manualmente abajo.')
      );
    }
    if (results.length > 0) {
      return results.map((p) =>
        h(
          'button',
          {
            key: p.sourceId,
            type: 'button',
            className: 'cg-cs-opt',
            onClick: () => void pick(p),
          },
          h(
            'span',
            { className: 'cg-cs-opt-ico' },
            h(UI.DynamicIcon, { icon: itemIcon, size: 14 })
          ),
          h(
            'span',
            { className: 'cg-cs-opt-main' },
            h('span', { className: 'cg-cs-opt-name' }, p.commercialName),
            h('span', { className: 'cg-cs-opt-meta' }, itemMeta(p))
          ),
          h('span', { className: 'cg-cs-opt-reg' }, `Reg. ${p.registrationNumber}`)
        )
      );
    }
    return h(
      'div',
      { className: 'cg-cs-empty' },
      h('div', { className: 'cg-cs-empty-t' }, 'No se encontró en el vademécum')
    );
  }

  // ── Vista: buscador ────────────────────────────────────────────────────────
  function renderSearch() {
    return h(
      'div',
      { className: 'cg-cs-wrap', ref },
      h(
        'div',
        { className: 'cg-cs-head' },
        h('span', { className: 'cg-cs-ico' }, h(UI.DynamicIcon, { icon: 'ShieldCheck', size: 16 })),
        h(
          'div',
          null,
          h('div', { className: 'cg-cs-title' }, title),
          h('div', { className: 'cg-cs-sub' }, subtitle)
        )
      ),
      h(
        'div',
        { className: 'cg-cs-input-wrap' },
        h(
          'span',
          { className: 'cg-cs-search-ico' },
          h(UI.DynamicIcon, { icon: 'Search', size: 15 })
        ),
        h(UI.Input, {
          value: query,
          placeholder,
          style: { paddingLeft: 36 },
          onChange: (e: { target: { value: string } }) => {
            setQuery(e.target.value);
            setOpen(true);
          },
          onFocus: () => {
            if (query.trim()) setOpen(true);
          },
        })
      ),
      open && query.trim() ? h('div', { className: 'cg-cs-menu' }, renderMenu()) : null,
      onCollapsedChange
        ? h(
            'button',
            {
              type: 'button',
              className: 'cg-cs-manual-link',
              onClick: () => onCollapsedChange(true),
            },
            '¿No lo encontrás? Cargalo manualmente'
          )
        : null
    );
  }

  return h(
    'div',
    { className: 'cg-cs' },
    h('style', null, STYLE),
    selected ? renderSelected(selected) : collapsed ? renderCollapsed() : renderSearch()
  );
}
