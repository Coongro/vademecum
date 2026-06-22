import { getHostReact, getHostUI } from '@coongro/plugin-sdk';

import { LabFormDialog } from '../../components/LabFormDialog.js';
import type { LabFormValues } from '../../components/LabFormDialog.js';
import { useLaboratories } from '../../hooks/useLaboratories.js';
import type { LaboratoryRow } from '../../schema/laboratory.js';

const UI = getHostUI();
const React = getHostReact();
const { useState, useCallback, useMemo } = React;
const h = React.createElement;

type EstadoFilter = 'activos' | 'inactivos' | 'todos';

/** Etiqueta legible del origen del registro para el badge. */
function sourceLabel(source: string): string {
  if (source === 'manual') return 'Manual';
  return source.toUpperCase();
}

const MUTED: Record<string, string> = { color: 'var(--cg-text-muted)' };

/**
 * Vista de gestión del maestro de laboratorios compartido (COONG-219).
 *
 * Vive en vademecum —el plugin neutral— porque el maestro lo comparten Farmacia
 * y Vacunación; ponerla en cualquiera de los dos lo silaría. Usa el `UI.DataTable`
 * del host (mismo look que Medicamentos: header de columnas, buscador, filtros);
 * el contenido de las celdas va con inline styles + vars cg-* para no depender de
 * la build de Tailwind del plugin.
 */
export function LaboratoriosView() {
  const { laboratories, loading, error, create, update, remove } = useLaboratories();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LaboratoryRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('todos');

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((lab: LaboratoryRow) => {
    setEditing(lab);
    setFormOpen(true);
  }, []);

  const handleSave = useCallback(
    async (data: LabFormValues) => {
      setSaving(true);
      try {
        if (editing) {
          await update(editing.id, data);
        } else {
          await create(data);
        }
        setFormOpen(false);
        setEditing(null);
      } finally {
        setSaving(false);
      }
    },
    [editing, create, update]
  );

  // El borrado se dispara desde el diálogo de edición (botón "Eliminar" + confirm
  // anidado), igual que Medicamentos — no hay acción inline en la fila.
  const handleDelete = useCallback(async () => {
    if (!editing) return;
    setDeleting(true);
    try {
      await remove(editing.id);
      setFormOpen(false);
      setEditing(null);
    } finally {
      setDeleting(false);
    }
  }, [editing, remove]);

  const existingNames = laboratories.filter((l) => l.id !== editing?.id).map((l) => l.name);

  // Filtrado client-side (el DataTable no filtra: solo expone search/filtros).
  const filtered = useMemo(() => {
    let result = laboratories;
    if (estadoFilter === 'activos') result = result.filter((l) => l.is_active);
    else if (estadoFilter === 'inactivos') result = result.filter((l) => !l.is_active);
    const q = searchInput.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.tax_id ?? '').toLowerCase().includes(q) ||
          (l.registration_number ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [laboratories, estadoFilter, searchInput]);

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Laboratorio',
        render: (lab: LaboratoryRow) =>
          h(
            'span',
            {
              style: {
                fontWeight: 600,
                color: lab.is_active ? 'var(--cg-text)' : 'var(--cg-text-muted)',
              },
            },
            lab.name
          ),
      },
      {
        key: 'cuit',
        header: 'CUIT',
        render: (lab: LaboratoryRow) =>
          h('span', { style: lab.tax_id ? undefined : MUTED }, lab.tax_id || '—'),
      },
      {
        key: 'registro',
        header: 'Inscripción',
        render: (lab: LaboratoryRow) =>
          h(
            'span',
            { style: lab.registration_number ? undefined : MUTED },
            lab.registration_number || '—'
          ),
      },
      {
        key: 'origen',
        header: 'Origen',
        render: (lab: LaboratoryRow) =>
          h(UI.Badge, { variant: 'secondary' } as any, sourceLabel(lab.source)),
      },
      {
        key: 'estado',
        header: 'Estado',
        render: (lab: LaboratoryRow) =>
          h(
            UI.Badge,
            { variant: lab.is_active ? 'success' : 'secondary' } as any,
            lab.is_active ? 'Activo' : 'Inactivo'
          ),
      },
    ],
    []
  );

  return h(
    'div',
    {
      style: {
        minHeight: '100%',
        padding: '24px',
        background: 'var(--cg-bg)',
        color: 'var(--cg-text)',
      },
    },

    // Header (título + acción), al estilo de Medicamentos
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '16px',
        },
      },
      h(
        'div',
        null,
        h(
          'h1',
          { style: { fontSize: '20px', fontWeight: 600, color: 'var(--cg-text)', margin: 0 } },
          'Laboratorios'
        ),
        h(
          'p',
          { style: { fontSize: '13px', color: 'var(--cg-text-muted)', margin: '4px 0 0' } },
          'Maestro compartido: lo usan Farmacia (medicamentos) y Vacunación.'
        )
      ),
      h(
        UI.Button,
        { variant: 'brand', onClick: openCreate } as any,
        h(UI.DynamicIcon, { icon: 'Plus', size: 14 } as any),
        ' Agregar laboratorio'
      )
    ),

    // Tabla — UI.DataTable (mismo patrón que Medicamentos)
    h(
      'div',
      {
        style: {
          background: 'var(--cg-bg)',
          border: '1px solid var(--cg-border)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        },
      },
      error
        ? h('div', { style: { color: 'var(--cg-danger)', fontSize: '14px' } }, error)
        : h(UI.DataTable, {
            data: filtered,
            columns,
            rowKey: (lab: LaboratoryRow) => lab.id,
            loading,
            onRowClick: (lab: LaboratoryRow) => openEdit(lab),
            searchValue: searchInput,
            onSearchChange: setSearchInput,
            searchPlaceholder: 'Buscar por nombre, CUIT o inscripción',
            filterSections: [
              {
                label: 'Estado',
                options: [
                  { value: 'todos', label: 'Todos' },
                  { value: 'activos', label: 'Activos' },
                  { value: 'inactivos', label: 'Inactivos' },
                ],
                value: estadoFilter,
                onChange: (v: string) => setEstadoFilter(v as EstadoFilter),
              },
            ],
            emptyState: {
              title: 'Sin laboratorios',
              description: 'Agregá el primer laboratorio para empezar.',
            },
            skeletonRows: 8,
          } as any)
    ),

    // Alta / edición (el borrado vive acá adentro, como en Medicamentos)
    h(LabFormDialog, {
      open: formOpen,
      onClose: () => {
        setFormOpen(false);
        setEditing(null);
      },
      onSave: handleSave,
      laboratory: editing,
      existingNames,
      saving,
      onDelete: editing ? handleDelete : undefined,
      deleting,
    })
  );
}
