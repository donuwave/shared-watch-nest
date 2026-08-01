import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feature } from './feature.entity';
import { FeatureRole } from './feature-role.entity';
import { FeatureService } from './feature.service';
import { UsersModule } from '../users/users.module';
import { FeatureController } from './feature.controller';
import { FeatureGuard } from '../../guards/feature.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Feature, FeatureRole]), UsersModule],
  controllers: [FeatureController],
  providers: [FeatureService, FeatureGuard],
  exports: [FeatureService],
})
export class FeatureModule {}
