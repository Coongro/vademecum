import { getHostReact, getHostUI } from '@coongro/plugin-sdk';

import { useLaboratories } from '../hooks/useLaboratories.js';

import { LabFormDialog } from './LabFormDialog.js';
import type { LabFormValues } from './LabFormDialog.js';

const UI = getHostUI();
const React = getHostReact();
const { useState, useCallback, useEffect, useRef } = React;
const h = React.createElement;

interface LaboratorySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Permitir crear un laboratorio nuevo desde el dropdown (default true). */
  allowCreate?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Selector de laboratorio COMPARTIDO (COONG-219).
 *
 * Único picker para Farmacia y Vacunación: se alimenta del maestro vía
 * `useLaboratories` (RPC a vademecum) y permite alta inline. Antes cada plugin
 * tenía su propio combobox sobre su propia tabla; ahora todos eligen del mismo
 * catálogo. Autocontenido a propósito —el consumidor solo pasa value/onChange—
 * para que ningún form tenga que reimplementar el fetch ni el alta.
 */
export function LaboratorySelect(props: LaboratorySelectProps) {
  const { value, onValueChange, allowCreate = true, placeholder, disabled } = props;
  const { laboratories, create, refetch, loading } = useLaboratories();
  const [createLabName, setCreateLabName] = useState<string | null>(null);
  const [savingLab, setSavingLab] = useState(false);

  // Si llega un value (id) que no está en la lista, refetchear una vez: pasa
  // cuando el lab se creó por fuera de este hook (ej. el autofill SENASA hace
  // ensureByName por RPC directo) y la lista quedó stale → el chip mostraría el
  // UUID crudo. El ref evita un loop si el id realmente no existe.
  const refetchedFor = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!value || loading) return;
    if (laboratories.some((l) => l.id === value)) return;
    if (refetchedFor.current.has(value)) return;
    refetchedFor.current.add(value);
    void refetch();
  }, [value, laboratories, loading, refetch]);

  const activeLabs = laboratories.filter((lab) => lab.is_active);

  const handleSaveNewLab = useCallback(
    async (data: LabFormValues) => {
      setSavingLab(true);
      try {
        const lab = await create(data);
        onValueChange(lab.id);
        setCreateLabName(null);
      } finally {
        setSavingLab(false);
      }
    },
    [create, onValueChange]
  );

  return h(
    React.Fragment,
    null,
    h(
      UI.Combobox,
      {
        value,
        onValueChange,
        disabled,
      } as any,
      h(UI.ComboboxChipTrigger, {
        placeholder: placeholder ?? 'Seleccionar laboratorio',
        renderChip: (val: string, onRemove: () => void) => {
          const lab = laboratories.find((l) => l.id === val);
          return h(UI.Chip, { size: 'sm', onRemove } as any, lab?.name ?? val);
        },
      } as any),
      h(
        UI.ComboboxContent,
        null,
        ...activeLabs.map((lab) =>
          h(UI.ComboboxItem, { key: lab.id, value: lab.id } as any, lab.name)
        ),
        allowCreate &&
          h(UI.ComboboxCreate, {
            label: 'Crear "{search}"',
            onCreate: (searchVal: string) => setCreateLabName(searchVal),
          } as any)
      )
    ),
    allowCreate &&
      h(LabFormDialog, {
        open: createLabName !== null,
        onClose: () => setCreateLabName(null),
        onSave: handleSaveNewLab,
        initialName: createLabName ?? '',
        existingNames: laboratories.map((l) => l.name),
        saving: savingLab,
      })
  );
}
