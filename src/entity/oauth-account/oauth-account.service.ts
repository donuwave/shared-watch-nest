import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuthAccount } from './oauth-account.entity';
import type { OAuthProvider } from './types/oauth-provider';
import type { OAuthProfile } from './types/oauth-profile';
import { UsersService } from '../users/users.service';
import { User } from '../users/users.entity';

@Injectable()
export class OAuthAccountService {
  constructor(
    @InjectRepository(OAuthAccount)
    private readonly oauthAccountRepository: Repository<OAuthAccount>,
    private readonly usersService: UsersService,
  ) {}

  async findByProvider(
    provider: OAuthProvider,
    providerUserId: string,
  ): Promise<OAuthAccount | null> {
    return await this.oauthAccountRepository.findOne({
      where: { provider, providerUserId },
      relations: ['user'],
    });
  }

  async findOrCreateUser(profile: OAuthProfile): Promise<User> {
    const existingAccount = await this.findByProvider(
      profile.provider,
      profile.providerUserId,
    );

    if (existingAccount) {
      return existingAccount.user;
    }

    const user = await this.findOrCreateUserForProfile(profile);
    await this.linkProfileToUser(user.id, profile);

    return user;
  }

  async linkProfileToUser(
    userId: string,
    profile: OAuthProfile,
  ): Promise<OAuthAccount> {
    const account = this.oauthAccountRepository.create({
      userId,
      provider: profile.provider,
      providerUserId: profile.providerUserId,
      email: profile.email,
      username: profile.username,
      avatarUrl: profile.avatarUrl ?? null,
    });

    return await this.oauthAccountRepository.save(account);
  }

  private async findOrCreateUserForProfile(
    profile: OAuthProfile,
  ): Promise<User> {
    const existingUser = await this.usersService
      .findByEmail(profile.email)
      .catch(() => null);

    if (existingUser) {
      return await this.updateOAuthUserProfile(existingUser, profile);
    }

    const user = await this.usersService.createOAuthUser({
      email: profile.email,
      username: profile.username,
      avatarUrl: profile.avatarUrl ?? null,
      isEmailVerified: profile.emailVerified ?? false,
    });

    return user;
  }

  private async updateOAuthUserProfile(
    user: User,
    profile: OAuthProfile,
  ): Promise<User> {
    let shouldSave = false;

    if (profile.emailVerified && !user.isEmailVerified) {
      user.isEmailVerified = true;
      user.emailVerifiedAt = new Date();
      user.emailVerificationDeadlineAt = null;
      shouldSave = true;
    }

    if (!user.avatarUrl && profile.avatarUrl) {
      user.avatarUrl = profile.avatarUrl;
      shouldSave = true;
    }

    if (!shouldSave) {
      return user;
    }

    return await this.usersService.save(user);
  }
}
