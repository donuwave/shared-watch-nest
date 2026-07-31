import { PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create.dto';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
