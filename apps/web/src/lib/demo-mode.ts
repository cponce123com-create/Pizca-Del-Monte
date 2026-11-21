/** Demo explícita o automática mientras no hay una base de datos configurada. */
export function isDemoMode() {
  return process.env.DEMO_MODE === 'true' || !process.env.DATABASE_URL?.trim();
}
