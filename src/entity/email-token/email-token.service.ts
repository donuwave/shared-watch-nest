import { InjectRepository } from '@nestjs/typeorm';
import { EmailToken } from './email-token.entity';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { EmailTokenPurpose } from './types/purpose';
import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class EmailTokenService {
  constructor(
    @InjectRepository(EmailToken)
    private readonly emailTokenRepository: Repository<EmailToken>,
  ) {}

  async createToken(
    userId: string,
    purpose: EmailTokenPurpose,
  ): Promise<string> {
    await this.invalidateUserTokens(userId, purpose);

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const token = this.emailTokenRepository.create({
      userId,
      purpose,
      tokenHash,
      expiresAt: this.getExpiresAt(purpose),
      usedAt: null,
    });

    await this.emailTokenRepository.save(token);

    return rawToken;
  }

  async verifyToken(
    rawToken: string,
    purpose: EmailTokenPurpose,
  ): Promise<EmailToken> {
    const tokenHash = this.hashToken(rawToken);

    const emailToken = await this.emailTokenRepository.findOne({
      where: {
        tokenHash,
        purpose,
      },
    });

    if (!emailToken) {
      throw new NotFoundException('Token not found');
    }

    if (emailToken.usedAt) {
      throw new BadRequestException('Token already used');
    }

    if (emailToken.expiresAt <= new Date()) {
      throw new BadRequestException('Token expired');
    }

    emailToken.usedAt = new Date();

    return await this.emailTokenRepository.save(emailToken);
  }

  async invalidateUserTokens(userId: string, purpose: EmailTokenPurpose) {
    await this.emailTokenRepository.update(
      {
        userId: userId,
        purpose,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      {
        usedAt: new Date(),
      },
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getExpiresAt(purpose: EmailTokenPurpose): Date {
    const expiresAt = new Date();

    switch (purpose) {
      case 'email_verify':
        expiresAt.setHours(expiresAt.getHours() + 24);
        return expiresAt;
      case 'login_otp':
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
        return expiresAt;
      case 'password_change':
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
        return expiresAt;
    }
  }
}
