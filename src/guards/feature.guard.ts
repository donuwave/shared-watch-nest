import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY } from '../decorators/feature.decorator';
import { FeatureService } from '../entity/feature/feature.service';
import type { FeatureKey } from '../entity/feature/types/feature-key';
import type { JwtPayload } from '../entity/auth/types/jwt-payload.types';

type FeatureRequest = {
  user?: JwtPayload;
};

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureService: FeatureService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.get<FeatureKey>(
      FEATURE_KEY,
      context.getHandler(),
    );

    if (!feature) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FeatureRequest>();
    const user = request.user;

    if (!user?.userId) {
      return false;
    }

    await this.featureService.assertCanUse(user.userId, feature);

    return true;
  }
}
