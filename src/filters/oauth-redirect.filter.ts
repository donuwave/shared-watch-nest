import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from '../entity/auth/auth.service';
import type { OAuthProvider } from '../entity/oauth-account/types/oauth-provider';

@Catch()
export class OAuthRedirectFilter implements ExceptionFilter {
  constructor(private readonly authService: AuthService) {}

  catch(_exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const provider = this.getProvider(request.path);

    if (!provider) {
      response.status(500).json({
        message: 'OAuth callback failed',
      });
      return;
    }

    response.redirect(this.authService.getOAuthErrorRedirectUrl(provider));
  }

  private getProvider(path: string): OAuthProvider | null {
    const match = path.match(/^\/auth\/(github|google|vk|yandex)\/callback$/);

    if (!match) {
      return null;
    }

    return match[1] as OAuthProvider;
  }
}
