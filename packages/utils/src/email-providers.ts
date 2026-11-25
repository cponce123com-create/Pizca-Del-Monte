// Email Providers for Pizca del Monte
// Supports Resend, Nodemailer (SMTP), SendGrid, Mailgun

import { EmailProvider, EmailAttachment, EmailResult } from './notifications';

// ============================================================================
// RESEND PROVIDER (Recommended for transactional emails)
// ============================================================================

export interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export class ResendProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;
  private baseUrl = 'https://api.resend.com/emails';

  constructor(config: ResendConfig) {
    this.apiKey = config.apiKey;
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;
  }

  async send(
    to: string | string[],
    subject: string,
    html: string,
    text: string,
    attachments?: EmailAttachment[]
  ): Promise<EmailResult> {
    try {
      const recipients = Array.isArray(to) ? to : [to];

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: recipients,
          subject,
          html,
          text,
          attachments: attachments?.map(a => ({
            filename: a.filename,
            content: a.content instanceof Buffer ? a.content.toString('base64') : a.content,
            contentType: a.contentType,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `Resend error: ${response.status}`,
        };
      }

      return {
        success: true,
        messageId: data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error sending email via Resend',
      };
    }
  }
}

// ============================================================================
// NODEMAILER SMTP PROVIDER (Generic SMTP)
// ============================================================================

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean; // true for 465, false for other ports
  auth: {
    user: string;
    pass: string;
  };
  fromEmail: string;
  fromName: string;
  pool?: boolean;
  maxConnections?: number;
  maxMessages?: number;
}

let nodemailer: any = null;

async function getNodemailer() {
  if (!nodemailer) {
    nodemailer = await import('nodemailer');
  }
  return nodemailer;
}

export class SMTPProvider implements EmailProvider {
  private transporter: any;
  private fromEmail: string;
  private fromName: string;

  constructor(config: SMTPConfig) {
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;

    getNodemailer().then(nm => {
      this.transporter = nm.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
        pool: config.pool ?? true,
        maxConnections: config.maxConnections ?? 5,
        maxMessages: config.maxMessages ?? 100,
      });
    });
  }

  async send(
    to: string | string[],
    subject: string,
    html: string,
    text: string,
    attachments?: EmailAttachment[]
  ): Promise<EmailResult> {
    if (!this.transporter) {
      // Wait for transporter to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      const recipients = Array.isArray(to) ? to.join(', ') : to;

      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: recipients,
        subject,
        html,
        text,
        attachments: attachments?.map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      };

      const info = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error sending email via SMTP',
      };
    }
  }

  async verify(): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.transporter) {
      await this.transporter.close();
    }
  }
}

// ============================================================================
// SENDGRID PROVIDER
// ============================================================================

export interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export class SendGridProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;
  private baseUrl = 'https://api.sendgrid.com/v3/mail/send';

  constructor(config: SendGridConfig) {
    this.apiKey = config.apiKey;
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;
  }

  async send(
    to: string | string[],
    subject: string,
    html: string,
    text: string,
    attachments?: EmailAttachment[]
  ): Promise<EmailResult> {
    try {
      const recipients = Array.isArray(to) ? to : [to];

      const personalizations = recipients.map(email => ({
        to: [{ email }],
        subject,
      }));

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations,
          from: {
            email: this.fromEmail,
            name: this.fromName,
          },
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html },
          ],
          attachments: attachments?.map(a => ({
            filename: a.filename,
            content: a.content instanceof Buffer ? a.content.toString('base64') : a.content,
            type: a.contentType,
            disposition: 'attachment',
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: data.errors?.[0]?.message || `SendGrid error: ${response.status}`,
        };
      }

      const messageId = response.headers.get('x-message-id') || undefined;
      return {
        success: true,
        messageId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error sending email via SendGrid',
      };
    }
  }
}

// ============================================================================
// MAILGUN PROVIDER
// ============================================================================

export interface MailgunConfig {
  apiKey: string;
  domain: string;
  fromEmail: string;
  fromName: string;
  region?: 'us' | 'eu';
}

export class MailgunProvider implements EmailProvider {
  private apiKey: string;
  private domain: string;
  private fromEmail: string;
  private fromName: string;
  private baseUrl: string;

  constructor(config: MailgunConfig) {
    this.apiKey = config.apiKey;
    this.domain = config.domain;
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;
    this.baseUrl = `https://api.${config.region === 'eu' ? 'eu.' : ''}mailgun.net/v3/${config.domain}/messages`;
  }

  async send(
    to: string | string[],
    subject: string,
    html: string,
    text: string,
    attachments?: EmailAttachment[]
  ): Promise<EmailResult> {
    try {
      const recipients = Array.isArray(to) ? to : [to];

      const formData = new FormData();
      formData.append('from', `${this.fromName} <${this.fromEmail}>`);
      recipients.forEach(email => formData.append('to', email));
      formData.append('subject', subject);
      formData.append('text', text);
      formData.append('html', html);

      if (attachments) {
        for (const attachment of attachments) {
          const blob = attachment.content instanceof Buffer
            ? new Blob([attachment.content], { type: attachment.contentType })
            : new Blob([attachment.content], { type: attachment.contentType });
          formData.append('attachment', blob, attachment.filename);
        }
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`api:${this.apiKey}`)}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `Mailgun error: ${response.status}`,
        };
      }

      return {
        success: true,
        messageId: data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error sending email via Mailgun',
      };
    }
  }
}

// ============================================================================
// MOCK PROVIDER (For testing/development)
// ============================================================================

export interface MockEmailLog {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
  timestamp: Date;
}

const mockEmailLogs: MockEmailLog[] = [];

export class MockEmailProvider implements EmailProvider {
  private delay: number;

  constructor(delayMs = 100) {
    this.delay = delayMs;
  }

  async send(
    to: string | string[],
    subject: string,
    html: string,
    text: string,
    attachments?: EmailAttachment[]
  ): Promise<EmailResult> {
    await new Promise(resolve => setTimeout(resolve, this.delay));

    mockEmailLogs.push({
      to,
      subject,
      html,
      text,
      attachments,
      timestamp: new Date(),
    });

    console.log(`[MOCK EMAIL] To: ${Array.isArray(to) ? to.join(', ') : to} | Subject: ${subject}`);

    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  static getLogs(): MockEmailLog[] {
    return [...mockEmailLogs];
  }

  static clearLogs(): void {
    mockEmailLogs.length = 0;
  }

  static getLastEmail(): MockEmailLog | undefined {
    return mockEmailLogs[mockEmailLogs.length - 1];
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export type EmailProviderType = 'resend' | 'smtp' | 'sendgrid' | 'mailgun' | 'mock';

export function createEmailProvider(
  type: EmailProviderType,
  config: ResendConfig | SMTPConfig | SendGridConfig | MailgunConfig | { delayMs?: number }
): EmailProvider {
  switch (type) {
    case 'resend':
      return new ResendProvider(config as ResendConfig);
    case 'smtp':
      return new SMTPProvider(config as SMTPConfig);
    case 'sendgrid':
      return new SendGridProvider(config as SendGridConfig);
    case 'mailgun':
      return new MailgunProvider(config as MailgunConfig);
    case 'mock':
      return new MockEmailProvider((config as { delayMs?: number }).delayMs ?? 100);
    default:
      throw new Error(`Unknown email provider type: ${type}`);
  }
}

// ============================================================================
// ENVIRONMENT-BASED CONFIGURATION
// ============================================================================

export function getEmailProviderFromEnv(): EmailProvider | null {
  const providerType = process.env.EMAIL_PROVIDER as EmailProviderType | undefined;

  if (!providerType) {
    console.warn('EMAIL_PROVIDER not set, emails will not be sent');
    return null;
  }

  switch (providerType) {
    case 'resend':
      if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not set');
        return null;
      }
      return createEmailProvider('resend', {
        apiKey: process.env.RESEND_API_KEY,
        fromEmail: process.env.EMAIL_FROM || 'noreply@pizcadelmonte.pe',
        fromName: process.env.EMAIL_FROM_NAME || 'Pizca del Monte',
      });

    case 'smtp':
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('SMTP configuration incomplete');
        return null;
      }
      return createEmailProvider('smtp', {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        fromEmail: process.env.EMAIL_FROM || 'noreply@pizcadelmonte.pe',
        fromName: process.env.EMAIL_FROM_NAME || 'Pizca del Monte',
      });

    case 'sendgrid':
      if (!process.env.SENDGRID_API_KEY) {
        console.warn('SENDGRID_API_KEY not set');
        return null;
      }
      return createEmailProvider('sendgrid', {
        apiKey: process.env.SENDGRID_API_KEY,
        fromEmail: process.env.EMAIL_FROM || 'noreply@pizcadelmonte.pe',
        fromName: process.env.EMAIL_FROM_NAME || 'Pizca del Monte',
      });

    case 'mailgun':
      if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
        console.warn('Mailgun configuration incomplete');
        return null;
      }
      return createEmailProvider('mailgun', {
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN,
        fromEmail: process.env.EMAIL_FROM || 'noreply@pizcadelmonte.pe',
        fromName: process.env.EMAIL_FROM_NAME || 'Pizca del Monte',
        region: process.env.MAILGUN_REGION as 'us' | 'eu' || 'us',
      });

    case 'mock':
      return createEmailProvider('mock', { delayMs: 50 });

    default:
      console.warn(`Unknown EMAIL_PROVIDER: ${providerType}`);
      return null;
  }
}