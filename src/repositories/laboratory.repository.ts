import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { laboratoryTable } from '../schema/laboratory.js';
import type { LaboratoryRow, NewLaboratoryRow } from '../schema/laboratory.js';

/**
 * Repositorio del maestro de laboratorios compartido (COONG-219).
 *
 * Se expone con prefix `vademecum.laboratories`; lo consumen vía RPC tanto
 * vaccination como vet-pharmacy (y cualquier futuro consumidor) sin importar la
 * clase —solo conocen el prefix. Por eso los métodos son la API pública del
 * maestro: cambiarlos rompe a los consumidores.
 */
export class LaboratoryRepository {
  constructor(private readonly db: ModuleDatabaseAPI) {}

  async list(): Promise<LaboratoryRow[]> {
    return this.db.ormQuery((tx) =>
      tx
        .select()
        .from(laboratoryTable)
        .where(isNull(laboratoryTable.deleted_at))
        .orderBy(asc(laboratoryTable.name))
    );
  }

  async listActive(): Promise<LaboratoryRow[]> {
    return this.db.ormQuery((tx) =>
      tx
        .select()
        .from(laboratoryTable)
        .where(and(isNull(laboratoryTable.deleted_at), eq(laboratoryTable.is_active, true)))
        .orderBy(asc(laboratoryTable.name))
    );
  }

  async getById({ id }: { id: string }): Promise<LaboratoryRow | undefined> {
    const rows = await this.db.ormQuery((tx) =>
      tx.select().from(laboratoryTable).where(eq(laboratoryTable.id, id)).limit(1)
    );
    return rows[0];
  }

  async create({ data }: { data: NewLaboratoryRow }): Promise<LaboratoryRow[]> {
    return this.db.ormQuery((tx) => tx.insert(laboratoryTable).values(data).returning());
  }

  async update({
    id,
    data,
  }: {
    id: string;
    data: Partial<NewLaboratoryRow>;
  }): Promise<LaboratoryRow[]> {
    return this.db.ormQuery((tx) =>
      tx
        .update(laboratoryTable)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .set({ ...data, updated_at: new Date().toISOString() } as any)
        .where(eq(laboratoryTable.id, id))
        .returning()
    );
  }

  async softDelete({ id }: { id: string }): Promise<void> {
    await this.db.ormQuery((tx) =>
      tx
        .update(laboratoryTable)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .set({ deleted_at: new Date().toISOString(), is_active: false } as any)
        .where(eq(laboratoryTable.id, id))
    );
  }

  /**
   * Busca un laboratorio activo por nombre (case-insensitive) y lo crea si no
   * existe. Es el punto de entrada del auto-upsert desde el autofill: cuando un
   * medicamento/vacuna se carga desde una fuente regulatoria (ej. SENASA), su
   * laboratorio se materializa acá una sola vez en vez de duplicarse como texto.
   *
   * Enriquece un registro previo si la fuente trae datos que faltaban (CUIT,
   * nº de inscripción) sin pisar lo ya cargado, para que un alta manual mínima
   * se complete cuando aparece el mismo lab desde el provider.
   */
  async ensureByName({
    name,
    taxId,
    registrationNumber,
    country,
    source,
  }: {
    name: string;
    taxId?: string | null;
    registrationNumber?: string | null;
    country?: string | null;
    source?: string;
  }): Promise<LaboratoryRow> {
    const trimmed = name.trim();
    const existing = await this.db.ormQuery((tx) =>
      tx
        .select()
        .from(laboratoryTable)
        .where(
          and(
            isNull(laboratoryTable.deleted_at),
            sql`lower(${laboratoryTable.name}) = lower(${trimmed})`
          )
        )
        .limit(1)
    );

    if (existing[0]) {
      const row = existing[0];
      const patch: Partial<NewLaboratoryRow> = {};
      if (taxId && !row.tax_id) patch.tax_id = taxId;
      if (registrationNumber && !row.registration_number)
        patch.registration_number = registrationNumber;
      if (country && !row.country) patch.country = country;
      if (Object.keys(patch).length === 0) return row;
      const updated = await this.update({ id: row.id, data: patch });
      return updated[0] ?? row;
    }

    const created = await this.create({
      data: {
        id: crypto.randomUUID(),
        name: trimmed,
        tax_id: taxId ?? null,
        registration_number: registrationNumber ?? null,
        country: country ?? null,
        source: source ?? 'manual',
      },
    });
    return created[0];
  }
}
