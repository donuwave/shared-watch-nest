import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../entity/users/users.service';

@Injectable()
export class EmailVerificationGuard implements CanActivate {
  constructor(private usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userPayload = request.user;

    if (!userPayload?.userId) {
      return false;
    }

    const user = await this.usersService.findOne(userPayload.userId);
    const state = this.usersService.getEmailVerificationState(user);

    if (state === 'verification_expired') {
      throw new ForbiddenException({
        message: 'Email verification required',
        code: 'EMAIL_VERIFICATION_EXPIRED',
      });
    }

    return true;
  }
}
