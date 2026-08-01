import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Type,
  mixin,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from '../entity/auth/auth.service';
import type { OAuthProvider } from '../entity/oauth-account/types/oauth-provider';

type PassportOAuthProvider = Exclude<OAuthProvider, 'vk'>;

type OAuthRequest = Request & {
  cookies?: Record<string, string | undefined>;
  query: {
    code?: string;
    error?: string;
    state?: string;
  };
};

function createOAuthStateGuard(
  provider: PassportOAuthProvider,
): Type<CanActivate> {
  @Injectable()
  class OAuthStateGuardMixin extends AuthGuard(provider) {
    constructor(private readonly authService: AuthService) {
      super();
    }

    canActivate(context: ExecutionContext) {
      const request = context.switchToHttp().getRequest<OAuthRequest>();
      const response = context.switchToHttp().getResponse<Response>();

      if (request.query.code) {
        this.authService.consumeOAuthState(
          provider,
          request.query.state,
          request.cookies,
          response,
        );
      }

      return super.canActivate(context);
    }

    getAuthenticateOptions(context: ExecutionContext) {
      const request = context.switchToHttp().getRequest<OAuthRequest>();

      if (request.query.code || request.query.error) {
        return undefined;
      }

      const response = context.switchToHttp().getResponse<Response>();

      return {
        state: this.authService.createOAuthState(provider, response),
      };
    }
  }

  return mixin(OAuthStateGuardMixin);
}

export const GitHubOAuthGuard = createOAuthStateGuard('github');
export const GoogleOAuthGuard = createOAuthStateGuard('google');
export const YandexOAuthGuard = createOAuthStateGuard('yandex');
