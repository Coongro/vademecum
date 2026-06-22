import { getHostReact, getHostUI } from '@coongro/plugin-sdk';

import type { LaboratoryRow } from '../schema/laboratory.js';

const UI = getHostUI();
const React = getHostReact();
const { useState, useEffect, useMemo } = React;
const h = React.createElement;

/** Campos editables de un laboratorio (subconjunto del row). */
export interface LabFormValues {
  name: string;
  tax_id: string | null;
  registration_number: string | null;
  is_active: boolean;
}

interface LabFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: LabFormValues) => Promise<void>;
  /** Si se pasa, el diálogo edita ese laboratorio; si no, crea uno nuevo. */
  laboratory?: LaboratoryRow | null;
  /** Nombre con el que prellenar un alta (ej. lo tipeado en el combobox). */
  initialName?: string;
  /** Nombres existentes para validar duplicados (excluye el que se está editando). */
  existingNames: string[];
  saving?: boolean;
  /**
   * Borrado (solo edición): si se pasa, el footer muestra "Eliminar" con un
   * confirm anidado, igual que el alta/edición de Medicamentos. El confirm va
   * ANIDADO en el árbol del FormDialog (no como Dialog hermano) para que el
   * DismissableLayer del padre no lo trate como click-afuera (ver COONG-218).
   */
  onDelete?: () => Promise<void>;
  deleting?: boolean;
}

/**
 * Alta y edición de laboratorio del maestro compartido. Único formulario para
 * los dos usos: el alta inline desde el selector (solo nombre, el resto opcional)
 * y la gestión completa desde la vista (con switch de activo + borrado). Tener un
 * solo diálogo evita que el alta rápida y la edición se desincronicen.
 */
export function LabFormDialog(props: LabFormDialogProps) {
  const {
    open,
    onClose,
    onSave,
    laboratory,
    initialName = '',
    existingNames,
    saving = false,
    onDelete,
    deleting = false,
  } = props;
  const isEditing = !!laboratory;

  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [active, setActive] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setName(laboratory?.name ?? initialName);
      setTaxId(laboratory?.tax_id ?? '');
      setRegistrationNumber(laboratory?.registration_number ?? '');
      setActive(laboratory?.is_active ?? true);
      setConfirmDelete(false);
    }
  }, [open, laboratory, initialName]);

  const duplicateError = useMemo(() => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return null;
    return existingNames.some((n) => n.toLowerCase() === trimmed)
      ? 'Ya existe un laboratorio con ese nombre en el tenant.'
      : null;
  }, [name, existingNames]);

  const isValid = name.trim().length > 0 && !duplicateError;

  const handleSubmit = () => {
    if (!isValid || saving) return;
    void onSave({
      name: name.trim(),
      tax_id: taxId.trim() || null,
      registration_number: registrationNumber.trim() || null,
      is_active: active,
    });
  };

  const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: '4px' };

  const footer = h(
    React.Fragment,
    null,
    isEditing && onDelete
      ? h(
          UI.Button,
          {
            variant: 'ghost',
            disabled: saving || deleting,
            onClick: () => setConfirmDelete(true),
            className: 'text-cg-danger mr-auto',
          } as any,
          h(UI.DynamicIcon, { icon: 'Trash2', size: 15 } as any),
          'Eliminar'
        )
      : null,
    h(UI.Button, { variant: 'outline', onClick: onClose } as any, 'Cancelar'),
    h(
      UI.Button,
      { disabled: !isValid || saving, onClick: handleSubmit } as any,
      saving ? 'Guardando...' : 'Guardar'
    )
  );

  return h(
    UI.FormDialog,
    {
      open,
      onOpenChange: (v: boolean) => !v && onClose(),
      title: isEditing ? 'Editar laboratorio' : 'Agregar laboratorio',
      footer,
      size: 'sm',
    } as any,
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
      h(
        'div',
        { style: fieldStyle },
        h(
          UI.Label,
          null,
          'Nombre del laboratorio',
          h('span', { style: { color: 'var(--cg-danger)', marginLeft: '2px' } }, '*')
        ),
        h(UI.Input, {
          value: name,
          onChange: (e: any) => setName(e.target.value),
          placeholder: 'Ej: Vetanco, Biogénesis Bagó…',
          autoFocus: true,
        } as any),
        duplicateError &&
          h('span', { style: { fontSize: '12px', color: 'var(--cg-danger)' } }, duplicateError)
      ),
      h(
        'div',
        { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } },
        h(
          'div',
          { style: fieldStyle },
          h(UI.Label, null, 'CUIT'),
          h(UI.Input, {
            value: taxId,
            onChange: (e: any) => setTaxId(e.target.value),
            placeholder: '30-12345678-9',
          } as any)
        ),
        h(
          'div',
          { style: fieldStyle },
          h(UI.Label, null, 'Nº de inscripción'),
          h(UI.Input, {
            value: registrationNumber,
            onChange: (e: any) => setRegistrationNumber(e.target.value),
            placeholder: 'Opcional',
          } as any)
        )
      ),
      isEditing
        ? h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' } },
            h(UI.Switch, {
              checked: active,
              onCheckedChange: (v: boolean) => setActive(v),
            } as any),
            h(
              'span',
              { style: { fontSize: '13px', color: 'var(--cg-text)' } },
              active ? 'Activo' : 'Inactivo'
            ),
            h(
              'span',
              { style: { fontSize: '11.5px', color: 'var(--cg-text-muted)' } },
              '· un laboratorio inactivo no aparece en el selector'
            )
          )
        : h(
            'p',
            {
              style: {
                fontSize: '11.5px',
                color: 'var(--cg-text-muted)',
                margin: '4px 0 0',
                lineHeight: 1.5,
              },
            },
            'El laboratorio se crea activo y queda disponible para Farmacia y Vacunación.'
          ),

      // Confirm de borrado ANIDADO en el árbol del FormDialog (ver nota en props).
      onDelete &&
        h(UI.ConfirmDialog, {
          open: confirmDelete,
          onOpenChange: (v: boolean) => !v && setConfirmDelete(false),
          title: 'Eliminar laboratorio',
          description: laboratory
            ? h(
                React.Fragment,
                null,
                '¿Seguro que querés eliminar el laboratorio ',
                h('strong', null, laboratory.name),
                '? Esta acción no se puede deshacer.'
              )
            : '',
          confirmLabel: 'Eliminar',
          loadingLabel: 'Eliminando...',
          loading: deleting,
          onConfirm: () => void onDelete(),
        } as any)
    )
  );
}
