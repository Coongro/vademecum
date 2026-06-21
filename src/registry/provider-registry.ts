/**
 * Registry de providers de catálogo regulatorio (server-only).
 *
 * Es un singleton de módulo: vive una sola vez por proceso de la API, bajo el
 * realpath `plugins/vademecum/dist/registry/provider-registry.js`. Todos los
 * plugins que importan `@coongro/vademecum/server` como DEPENDENCIA lo resuelven
 * por symlink a ese mismo realpath → comparten la misma instancia (Node cachea
 * módulos por realpath y el loader NO usa cache-buster). Así, un provider que
 * registra `@coongro/vademecum-senasa` en su activate() es visible para el resto
 * del código que importa el registry como dep.
 *
 * IMPORTANTE: para que la garantía de instancia única se sostenga, `vademecum`
 * debe usarse SOLO como librería importada — nunca activarse como plugin propio
 * (eso cargaría una copia desde su snapshot temporal, con otro realpath). Por
 * eso su manifest no declara `entry`.
 */

import type { RegulatoryCatalogProvider } from '../contracts/regulatory-catalog-provider.js';

class ProviderRegistry {
  private readonly byId = new Map<string, RegulatoryCatalogProvider>();

  /**
   * Registra (o reemplaza) un provider. Idempotente por `id`: re-registrar el
   * mismo provider tras una reactivación del plugin no duplica.
   */
  register(provider: RegulatoryCatalogProvider): void {
    this.byId.set(provider.id, provider);
  }

  /** Quita un provider del registro (ej. en deactivate() del plugin provider). */
  unregister(id: string): void {
    this.byId.delete(id);
  }

  /** Provider por id (ej. "senasa"). */
  get(id: string): RegulatoryCatalogProvider | undefined {
    return this.byId.get(id);
  }

  /**
   * Resuelve el provider que cubre un país (gating por tenant). Devuelve el
   * primero que matchee; hoy hay a lo sumo uno por país instalado por tenant.
   */
  getByCountry(country: string): RegulatoryCatalogProvider | undefined {
    for (const provider of this.byId.values()) {
      if (provider.country === country) return provider;
    }
    return undefined;
  }

  /** Todos los providers registrados en el proceso. */
  list(): RegulatoryCatalogProvider[] {
    return [...this.byId.values()];
  }
}

/** Instancia singleton compartida por proceso (ver doc del módulo). */
export const providerRegistry = new ProviderRegistry();

/** Tipo exportado para anotaciones de los consumidores. */
export type { ProviderRegistry };
