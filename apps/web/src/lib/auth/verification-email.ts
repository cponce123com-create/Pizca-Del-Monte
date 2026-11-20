import nodemailer from 'nodemailer';

export function emailDeliveryConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    (process.env.SMTP_PASS || process.env.SMTP_PASSWORD) &&
    process.env.SMTP_FROM &&
    (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL)
  );
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  if (!emailDeliveryConfigured()) {
    throw new Error('SMTP no configurado');
  }

  const appUrl = new URL(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL!);
  if (appUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new Error('APP_URL debe utilizar HTTPS en producción');
  }
  if (appUrl.protocol !== 'https:' && appUrl.protocol !== 'http:') {
    throw new Error('APP_URL inválida');
  }
  const port = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Puerto SMTP inválido');
  }
  const link = new URL('/api/auth/verify-email', appUrl);
  link.searchParams.set('token', token);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER!, pass: (process.env.SMTP_PASS || process.env.SMTP_PASSWORD)! },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM!,
    to: email,
    subject: 'Verifica tu correo · Pizca del Monte',
    text: `Confirma tu correo para activar tu cuenta de Pizca del Monte. El enlace vence en 24 horas:\n\n${link.toString()}\n\nSi no creaste la cuenta, ignora este mensaje.`,
  });
}
