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
}

/**
 * Alta y edición de laboratorio del maestro compartido. Único formulario para
 * los dos usos: el alta inline desde el selector (solo nombre, el resto opcional)
 * y la gestión completa desde la vista. Tener un solo diálogo evita que el alta
 * rápida y la edición se desincronicen en campos o validación.
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
  } = props;
  const isEditing = !!laboratory;

  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');

  useEffect(() => {
    if (open) {
      setName(laboratory?.name ?? initialName);
      setTaxId(laboratory?.tax_id ?? '');
      setRegistrationNumber(laboratory?.registration_number ?? '');
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

  const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: '4px' };

  return h(UI.FormDialogSubmit, {
    open,
    onOpenChange: (val: boolean) => !val && onClose(),
    title: isEditing ? 'Editar laboratorio' : 'Agregar laboratorio',
    eyebrow: isEditing ? 'EDITAR LABORATORIO' : 'NUEVO LABORATORIO',
    size: 'sm',
    submitLabel: saving ? 'Guardando...' : 'Guardar',
    onCancel: onClose,
    disabled: !isValid || saving,
    children: ({ formRef }: any) =>
      h(
        'form',
        {
          ref: formRef,
          onSubmit: (e: Event) => {
            e.preventDefault();
            if (isValid) {
              void onSave({
                name: name.trim(),
                tax_id: taxId.trim() || null,
                registration_number: registrationNumber.trim() || null,
              });
            }
          },
          style: { display: 'flex', flexDirection: 'column', gap: '12px' },
        },
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
        !isEditing &&
          h(
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
          )
      ),
  });
}
