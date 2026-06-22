import { sql } from 'drizzle-orm';
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Maestro de laboratorios COMPARTIDO (COONG-219).
 *
 * Vive en vademecum —el plugin neutral— y no en vaccination ni vet-pharmacy,
 * para que ambos consuman una única fuente de verdad vía el repo expuesto con
 * prefix `vademecum.laboratories`. Antes había dos: la tabla siloada de vacunas
 * (`module_vaccination_laboratories`) y el texto libre `medication.laboratory`.
 *
 * Agnóstico de fuente: `source` distingue altas manuales del aporte de un
 * provider (ej. "senasa"). `country` habilita el gating multi-país sin atarse a
 * Argentina —null = sin gating, visible en cualquier tenant.
 */
export const laboratoryTable = pgTable('module_vademecum_laboratories', {
  id: uuid('id').primaryKey().notNull(),
  name: text('name').notNull(),
  /** CUIT / tax id de la firma titular (de las firmas de SENASA, opcional). */
  tax_id: text('tax_id'),
  /** Nº de inscripción de la firma en el organismo regulador (opcional). */
  registration_number: text('registration_number'),
  /** ISO 3166-1 alpha-2 del país de la firma (ej. "AR"). null = sin gating. */
  country: text('country'),
  /** Origen del registro: "manual" o el id del provider que lo aportó (ej. "senasa"). */
  source: text('source').notNull().default('manual'),
  is_active: boolean('is_active').notNull().default(true),
  deleted_at: timestamp('deleted_at', { mode: 'string' }),
  created_at: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
  updated_at: timestamp('updated_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export type LaboratoryRow = typeof laboratoryTable.$inferSelect;

/**
 * Tipo de inserción derivado del select en vez de `$inferInsert`.
 *
 * Bajo el `strict: false` del tsconfig de los plugins, las mapped types de
 * `$inferInsert` colapsan y dejan SOLO las columnas requeridas (`id`, `name`),
 * descartando las opcionales (tax_id, source, etc.). Otros plugins no lo notan
 * porque insertan únicamente id+name; acá sí escribimos las columnas de la firma.
 * Derivarlo del `$inferSelect` (que sí resuelve completo) lo deja robusto sin
 * tener que activar strict en todo el plugin: id+name requeridos, el resto
 * opcional (las defaults de la tabla los completan).
 */
export type NewLaboratoryRow = Partial<LaboratoryRow> & Pick<LaboratoryRow, 'id' | 'name'>;
