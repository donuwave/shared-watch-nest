import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

type SmtpTransportOptions = SMTPTransport.Options & {
  family?: 4 | 6;
};

@Injectable()
export class MailService {
  private transporter?: Transporter;
  constructor(private readonly configService: ConfigService) {}

  async sendEmailVerification(email: string, token: string): Promise<void> {
    const link = this.buildEmailVerificationLink(token);

    if (!this.isSmtpConfigured()) {
      console.log({
        type: 'email_verification',
        mode: 'log_only',
        email,
        link,
      });

      return;
    }

    await this.sendMail({
      to: email,
      subject: 'Подтвердите email в Shared Watch',
      text: [
        'Подтвердите email, чтобы продолжить пользоваться Shared Watch.',
        '',
        `Ссылка подтверждения: ${link}`,
        '',
        'Если вы не регистрировались в Shared Watch, просто проигнорируйте это письмо.',
      ].join('\n'),
      html: [
        '<p>Подтвердите email, чтобы продолжить пользоваться Shared Watch.</p>',
        `<p><a href="${link}">Подтвердить email</a></p>`,
        '<p>Если вы не регистрировались в Shared Watch, просто проигнорируйте это письмо.</p>',
      ].join(''),
    });
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const link = this.buildPasswordResetLink(token);

    if (!this.isSmtpConfigured()) {
      console.log({
        type: 'password_reset',
        mode: 'log_only',
        email,
        link,
      });

      return;
    }

    await this.sendMail({
      to: email,
      subject: 'Сброс пароля в Shared Watch',
      text: [
        'Вы запросили сброс пароля в Shared Watch.',
        '',
        `Ссылка для сброса пароля: ${link}`,
        '',
        'Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.',
      ].join('\n'),
      html: [
        '<p>Вы запросили сброс пароля в Shared Watch.</p>',
        `<p><a href="${link}">Сбросить пароль</a></p>`,
        '<p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>',
      ].join(''),
    });
  }

  async sendTestEmail(email: string): Promise<{ mode: 'smtp' | 'log_only' }> {
    if (!this.isSmtpConfigured()) {
      console.log({
        type: 'mail_test',
        mode: 'log_only',
        email,
      });

      return { mode: 'log_only' };
    }

    await this.sendMail({
      to: email,
      subject: 'Shared Watch: тестовое письмо',
      text: [
        'Это тестовое письмо от Shared Watch.',
        '',
        'Если вы получили это письмо, SMTP настроен корректно.',
      ].join('\n'),
      html: [
        '<p>Это тестовое письмо от Shared Watch.</p>',
        '<p>Если вы получили это письмо, SMTP настроен корректно.</p>',
      ].join(''),
    });

    return { mode: 'smtp' };
  }

  private async sendMail(message: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    try {
      await this.getTransporter().sendMail({
        from: this.configService.get<string>(
          'MAIL_FROM',
          'Shared Watch <no-reply@shared-watch.local>',
        ),
        ...message,
      });
    } catch (error) {
      const smtpError = error as {
        code?: string;
        command?: string;
        message?: string;
      };

      throw new ServiceUnavailableException({
        message: 'SMTP delivery failed',
        code: smtpError.code,
        command: smtpError.command,
        detail: smtpError.message,
      });
    }
  }

  private buildEmailVerificationLink(token: string): string {
    return this.buildFrontendLink('/verify-email', token);
  }

  private buildPasswordResetLink(token: string): string {
    return this.buildFrontendLink('/reset-password', token);
  }

  private buildFrontendLink(path: string, token: string): string {
    const frontendUrl = this.configService.get<string>(
      'APP_FRONTEND_URL',
      'http://localhost:3000',
    );
    const url = new URL(path, frontendUrl);
    url.searchParams.set('token', token);

    return url.toString();
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const host = this.configService.getOrThrow<string>('MAIL_HOST');

      const transportOptions: SmtpTransportOptions = {
        host,
        port: this.getMailPort(),
        secure: this.configService.get<string>('MAIL_SECURE') === 'true',
        requireTLS: this.configService.get<string>('MAIL_SECURE') !== 'true',
        family: 4,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        tls: {
          servername: host,
        },
        auth: {
          user: this.configService.getOrThrow<string>('MAIL_USER'),
          pass: this.configService.getOrThrow<string>('MAIL_PASSWORD'),
        },
      };

      this.transporter = nodemailer.createTransport(transportOptions);
    }

    return this.transporter;
  }

  private getMailPort(): number {
    const port = Number(this.configService.get<string>('MAIL_PORT', '587'));

    if (Number.isNaN(port)) {
      return 587;
    }

    return port;
  }

  private isSmtpConfigured(): boolean {
    return Boolean(
      this.configService.get<string>('MAIL_HOST') &&
      this.configService.get<string>('MAIL_USER') &&
      this.configService.get<string>('MAIL_PASSWORD'),
    );
  }
}
