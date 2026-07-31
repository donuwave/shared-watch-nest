import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { Role } from './role.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from '../../guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Role]), UsersModule],
  providers: [RoleService, RolesGuard],
  controllers: [RoleController],
  exports: [RoleService],
})
export class RoleModule {}
