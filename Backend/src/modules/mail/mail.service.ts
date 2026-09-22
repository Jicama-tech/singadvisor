import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; path: string }[];
};

/**
 * Thin SMTP wrapper. Delivery is always best-effort from the caller's side
 * (a failed email must never fail a ticket purchase that already took
 * someone's money) — this service itself throws on failure so callers can
 * log it; swallowing happens at the call site, not here.
 *
 * Configured via env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
 * SMTP_FROM (defaults to SMTP_USER). If SMTP_HOST is unset, `send()` throws
 * immediately with a clear message instead of hanging on a real connection
 * attempt — same "fail clearly, not silently" approach as an unconfigured
 * Razorpay client.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;
    const host = process.env.SMTP_HOST;
    if (!host) {
      throw new ServiceUnavailableException(
        'Email is not configured — set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS in Backend/.env',
      );
    }
    this.transporter = createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    return this.transporter;
  }

  async send(input: SendEmailInput): Promise<void> {
    await this.getTransporter().sendMail({
      from: this.sender(),
      ...input,
      headers: {
        // Every message goes out from an unmonitored no-reply address (the
        // footer of email-layout says so to the reader). These say it to the
        // machines: RFC 3834's marker that the message is automated, so
        // well-behaved vacation responders and ticketing systems do not answer
        // it, and Exchange/Outlook's own equivalent for out-of-office and
        // auto-replies. Bounces (NDRs) are deliberately NOT suppressed — they
        // are how a dead address gets noticed.
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
      },
    });
  }

  /**
   * The From line. SMTP_FROM is documented as a bare address
   * (noreply@singadvisor.com), which inboxes display as "noreply" — so a bare
   * address gets the brand as its display name. One already written as
   * `Name <address>` is left exactly as the deployment set it.
   */
  private sender(): string | { name: string; address: string } {
    const from = (
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      'noreply@singadvisor.com'
    ).trim();
    return from.includes('<') ? from : { name: 'SingAdvisor', address: from };
  }

  /** Never throws — logs and returns whether it succeeded, for best-effort call sites. */
  async sendBestEffort(input: SendEmailInput): Promise<boolean> {
    try {
      await this.send(input);
      return true;
    } catch (err) {
      this.logger.warn(`Email to ${input.to} failed: ${(err as Error).message}`);
      return false;
    }
  }
}
