import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UsersService } from '../entity/users/users.service';
import { JwtPayload } from '../entity/auth/types/jwt-payload.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Получаем разрешённые роли из декоратора @Roles()
    const requiredRoles = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler(),
    );

    // Если @Roles() не указан — разрешаем доступ
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Получаем запрос
    const request = context.switchToHttp().getRequest();
    const userPayload = request.user as JwtPayload;

    // Если нет пользователя в запросе — запрещаем
    if (!userPayload || !userPayload.userId) {
      return false;
    }

    // Получаем пользователя из БД с ролью
    const user = await this.usersService.findOne(userPayload.userId);

    // Если у пользователя нет роли — запрещаем
    if (!user.role) {
      throw new ForbiddenException('User does not have a role assigned');
    }

    // Проверяем, есть ли у пользователя нужная роль
    const hasRole = requiredRoles.includes(user.role.name);

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Добавляем роль в запрос для дальнейшего использования
    request.userRole = user.role;

    return true;
  }
}
