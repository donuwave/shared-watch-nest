import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  sendEmailVerification(email: string, token: string): Promise<void> {
    const link = this.buildEmailVerificationLink(token);

    console.log({
      type: 'email_verification',
      email,
      link,
    });

    return Promise.resolve();
  }

  private buildEmailVerificationLink(token: string): string {
    return `http://localhost:3000/verify-email?token=${token}`;
  }
}
