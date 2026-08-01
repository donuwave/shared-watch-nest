import { SetMetadata } from '@nestjs/common';
import type { GlobalRoleName } from '../entity/role/types/global-role';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: GlobalRoleName[]) =>
  SetMetadata(ROLES_KEY, roles);
