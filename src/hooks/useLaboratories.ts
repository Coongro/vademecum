import { getHostReact, actions } from '@coongro/plugin-sdk';

import type { LaboratoryRow } from '../schema/laboratory.js';

const { useState, useEffect, useCallback, useRef } = getHostReact();

/** Datos para crear un laboratorio en el maestro compartido. */
export interface CreateLaboratoryInput {
  name: string;
  tax_id?: string | null;
  registration_number?: string | null;
  country?: string | null;
  source?: string;
}

export interface UseLaboratoriesResult {
  laboratories: LaboratoryRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (data: CreateLaboratoryInput) => Promise<LaboratoryRow>;
  update: (id: string, data: Partial<LaboratoryRow>) => Promise<LaboratoryRow>;
  remove: (id: string) => Promise<void>;
}

/**
 * Hook reutilizable del maestro de laboratorios compartido (COONG-219).
 *
 * Habla con el repo de vademecum por RPC (`vademecum.laboratories.*`), no importa
 * la clase: cualquier plugin (vet-pharmacy, vaccination, futuros) lo usa con tal
 * de que vademecum esté instalado en el tenant (lo está, por ser dependencia).
 * Centralizar el contrato acá evita que cada consumidor reimplemente el fetch y
 * se desincronice del maestro.
 */
export function useLaboratories(): UseLaboratoriesResult {
  const [laboratories, setLaboratories] = useState<LaboratoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await actions.execute<LaboratoryRow[]>('vademecum.laboratories.list');
      if (mountedRef.current) {
        setLaboratories(Array.isArray(result) ? result : []);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Error al cargar laboratorios');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const create = useCallback(
    async (data: CreateLaboratoryInput): Promise<LaboratoryRow> => {
      const result = await actions.execute<LaboratoryRow[]>('vademecum.laboratories.create', {
        data: { id: crypto.randomUUID(), ...data },
      });
      await refetch();
      return result[0];
    },
    [refetch]
  );

  const update = useCallback(
    async (id: string, data: Partial<LaboratoryRow>): Promise<LaboratoryRow> => {
      const result = await actions.execute<LaboratoryRow[]>('vademecum.laboratories.update', {
        id,
        data,
      });
      await refetch();
      return result[0];
    },
    [refetch]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await actions.execute('vademecum.laboratories.softDelete', { id });
      await refetch();
    },
    [refetch]
  );

  return { laboratories, loading, error, refetch, create, update, remove };
}
