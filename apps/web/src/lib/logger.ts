/** Registro acotado: no incluir contraseñas, tokens ni datos personales en mensajes. */
export const logger = {
  error(message: string, error?: unknown) {
    if (process.env.NODE_ENV !== 'test') console.error(message, error instanceof Error ? error.message : '');
  },
};
