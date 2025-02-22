export interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
}

export interface Template {
  subject: string;
  html: string;
}

export interface Mail {
  from: SMTPConfig;
  to: string;
  template: Template;
}

export interface MassMailOptions {
  campaignId: string;
  from: SMTPConfig;
  template: Template;
}

export interface MailResult {
  email: string;
  success: boolean;
  error?: string;
  messageId?: string;
  sentAt?: Date;
}

