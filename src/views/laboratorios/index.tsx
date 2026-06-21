import { getHostReact, getHostUI } from '@coongro/plugin-sdk';

import { LabFormDialog } from '../../components/LabFormDialog.js';
import type { LabFormValues } from '../../components/LabFormDialog.js';
import { useLaboratories } from '../../hooks/useLaboratories.js';
import type { LaboratoryRow } from '../../schema/laboratory.js';

const UI = getHostUI();
const React = getHostReact();
const { useState, useCallback } = React;
const h = React.createElement;

/** Etiqueta legible del origen del registro para el badge. */
function sourceLabel(source: string): string {
  if (source === 'manual') return 'Manual';
  return source.toUpperCase();
}

/**
 * Vista de gestión del maestro de laboratorios compartido (COONG-219).
 *
 * Vive en vademecum —el plugin neutral— porque el maestro lo comparten Farmacia
 * y Vacunación; ponerla en cualquiera de los dos lo silaría. Es master-data de
 * baja frecuencia: alta/edición/baja del catálogo que después consume el
 * selector compartido. Inline styles + vars cg-* a propósito, para no chocar con
 * la cascada Tailwind de otros plugins.
 */
export function LaboratoriosView() {
  const { laboratories, loading, error, create, update, remove } = useLaboratories();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LaboratoryRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const labToDelete = laboratories.find((l) => l.id === confirmingId) ?? null;

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

  const handleToggleActive = useCallback(
    async (lab: LaboratoryRow) => {
      await update(lab.id, { is_active: !lab.is_active });
    },
    [update]
  );

  const handleRemove = useCallback(
    async (id: string) => {
      setDeleting(true);
      try {
        await remove(id);
        setConfirmingId(null);
      } finally {
        setDeleting(false);
      }
    },
    [remove]
  );

  const existingNames = laboratories.filter((l) => l.id !== editing?.id).map((l) => l.name);

  return h(
    'div',
    {
      style: {
        minHeight: '100vh',
        background: 'var(--cg-bg-secondary)',
        padding: '24px',
      },
    },
    // Header
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '20px',
        },
      },
      h(
        'div',
        null,
        h(
          'div',
          {
            style: {
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--cg-text-muted)',
              marginBottom: '4px',
            },
          },
          'CATÁLOGO COMPARTIDO'
        ),
        h(
          'h1',
          { style: { fontSize: '22px', fontWeight: 800, color: 'var(--cg-text)', margin: 0 } },
          'Laboratorios'
        ),
        h(
          'p',
          {
            style: {
              fontSize: '13px',
              color: 'var(--cg-text-muted)',
              margin: '6px 0 0',
              maxWidth: '560px',
              lineHeight: 1.5,
            },
          },
          'Maestro único de laboratorios. Lo usan tanto Farmacia (medicamentos) como Vacunación; ',
          'editarlo acá impacta en ambos.'
        )
      ),
      h(
        UI.Button,
        { variant: 'brand', onClick: openCreate } as any,
        h(UI.DynamicIcon, { icon: 'Plus', size: 14 } as any),
        ' Agregar laboratorio'
      )
    ),

    // Card con la lista
    h(
      'div',
      {
        style: {
          background: 'var(--cg-bg)',
          border: '1px solid var(--cg-border)',
          borderRadius: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        },
      },
      error
        ? h(
            'div',
            { style: { padding: '24px', color: 'var(--cg-danger)', fontSize: '14px' } },
            error
          )
        : loading
          ? h(
              'div',
              { style: { padding: '24px', color: 'var(--cg-text-muted)', fontSize: '14px' } },
              'Cargando laboratorios…'
            )
          : laboratories.length === 0
            ? h(UI.EmptyState, {
                title: 'Sin laboratorios',
                description: 'Agregá el primer laboratorio para empezar.',
              } as any)
            : laboratories.map((lab, i) =>
                h(
                  'div',
                  {
                    key: lab.id,
                    style: {
                      padding: '14px 20px',
                      borderBottom:
                        i < laboratories.length - 1 ? '1px solid var(--cg-border)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    },
                  },
                  h(
                    'div',
                    { style: { flex: 1, minWidth: 0 } },
                    h(
                      'div',
                      {
                        style: {
                          fontWeight: 700,
                          fontSize: '14px',
                          color: lab.is_active ? 'var(--cg-text)' : 'var(--cg-text-muted)',
                        },
                      },
                      lab.name
                    ),
                    h(
                      'div',
                      {
                        style: {
                          fontSize: '12px',
                          color: 'var(--cg-text-muted)',
                          marginTop: '2px',
                          display: 'flex',
                          gap: '12px',
                          flexWrap: 'wrap',
                        },
                      },
                      lab.tax_id && h('span', null, `CUIT ${lab.tax_id}`),
                      lab.registration_number &&
                        h('span', null, `Inscripción ${lab.registration_number}`),
                      !lab.tax_id &&
                        !lab.registration_number &&
                        h('span', null, 'Sin datos de firma')
                    )
                  ),
                  h(UI.Badge, { variant: 'secondary' } as any, sourceLabel(lab.source)),
                  h(
                    UI.Badge,
                    { variant: lab.is_active ? 'success' : 'secondary' } as any,
                    lab.is_active ? 'Activo' : 'Inactivo'
                  ),
                  h(
                    UI.IconButton,
                    {
                      variant: 'ghost',
                      size: 'sm',
                      'aria-label': `Editar laboratorio ${lab.name}`,
                      onClick: () => openEdit(lab),
                    } as any,
                    h(UI.DynamicIcon, { icon: 'Pencil', size: 14 } as any)
                  ),
                  h(
                    UI.IconButton,
                    {
                      variant: 'ghost',
                      size: 'sm',
                      'aria-label': `${lab.is_active ? 'Desactivar' : 'Activar'} laboratorio ${lab.name}`,
                      onClick: () => handleToggleActive(lab),
                    } as any,
                    h(UI.DynamicIcon, {
                      icon: lab.is_active ? 'Archive' : 'ArchiveRestore',
                      size: 14,
                    } as any)
                  ),
                  h(
                    UI.IconButton,
                    {
                      variant: 'ghost',
                      size: 'sm',
                      'aria-label': `Eliminar laboratorio ${lab.name}`,
                      onClick: () => setConfirmingId(lab.id),
                    } as any,
                    h(UI.DynamicIcon, {
                      icon: 'Trash2',
                      size: 14,
                      color: 'var(--cg-danger)',
                    } as any)
                  )
                )
              )
    ),

    // Nota al pie
    h(
      'p',
      {
        style: {
          fontSize: '11.5px',
          color: 'var(--cg-text-muted)',
          margin: '12px 2px 0',
          lineHeight: 1.5,
        },
      },
      'Desactivar un laboratorio lo oculta del selector sin borrarlo. Eliminar lo quita del maestro; ',
      'los productos que ya lo referencien conservan el dato hasta reasignarlos.'
    ),

    // Alta / edición
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
    }),

    // Confirmación de borrado
    h(UI.ConfirmDialog, {
      open: confirmingId !== null,
      onOpenChange: (val: boolean) => !val && setConfirmingId(null),
      title: 'Eliminar laboratorio',
      description: labToDelete
        ? h(
            React.Fragment,
            null,
            '¿Seguro que querés eliminar el laboratorio ',
            h('strong', null, labToDelete.name),
            '? Esta acción no se puede deshacer.'
          )
        : '',
      confirmLabel: 'Eliminar',
      loadingLabel: 'Eliminando...',
      loading: deleting,
      onConfirm: () => confirmingId && void handleRemove(confirmingId),
    } as any)
  );
}
