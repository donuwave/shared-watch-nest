import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feature } from './feature.entity';
import { UsersService } from '../users/users.service';
import type { FeatureKey } from './types/feature-key';
import { UpdateFeatureDto } from './dto/update-feature.dto';

type DefaultFeature = {
  key: FeatureKey;
  displayName: string;
  description: string;
  requiresEmailVerified: boolean;
  requiresUnblocked: boolean;
};

@Injectable()
export class FeatureService {
  constructor(
    @InjectRepository(Feature)
    private readonly featureRepository: Repository<Feature>,
    private readonly usersService: UsersService,
  ) {}

  async findAll(): Promise<Feature[]> {
    return await this.featureRepository.find({
      relations: ['roles', 'roles.role'],
      order: { key: 'ASC' },
    });
  }

  async findByKey(key: FeatureKey): Promise<Feature | null> {
    return await this.featureRepository.findOne({
      where: { key },
      relations: ['roles', 'roles.role'],
    });
  }

  async findOne(id: string): Promise<Feature> {
    const feature = await this.featureRepository.findOne({
      where: { id },
      relations: ['roles', 'roles.role'],
    });

    if (!feature) {
      throw new NotFoundException('Feature does not exist');
    }

    return feature;
  }

  async update(id: string, updateFeatureDto: UpdateFeatureDto) {
    const feature = await this.findOne(id);

    Object.assign(feature, updateFeatureDto);

    return await this.featureRepository.save(feature);
  }

  async canUse(userId: string, key: FeatureKey): Promise<boolean> {
    const feature = await this.findByKey(key);

    if (!feature?.isActive) {
      return false;
    }

    const user = await this.usersService.findOne(userId);

    if (feature.requiresUnblocked && user.blocked) {
      return false;
    }

    if (feature.requiresEmailVerified && !user.isEmailVerified) {
      return false;
    }

    const allowedRoleNames = feature.roles
      .map((featureRole) => featureRole.role?.name)
      .filter(Boolean);

    if (allowedRoleNames.length === 0) {
      return true;
    }

    return Boolean(
      user.role?.name && allowedRoleNames.includes(user.role.name),
    );
  }

  async assertCanUse(userId: string, key: FeatureKey): Promise<void> {
    const canUseFeature = await this.canUse(userId, key);

    if (!canUseFeature) {
      throw new ForbiddenException({
        message: 'Feature is not available',
        code: 'FEATURE_NOT_AVAILABLE',
        feature: key,
      });
    }
  }

  async seedDefaultFeatures(): Promise<void> {
    const defaultFeatures: DefaultFeature[] = [
      {
        key: 'rooms.create',
        displayName: 'Создание комнат',
        description: 'Позволяет verified пользователю создавать комнаты',
        requiresEmailVerified: true,
        requiresUnblocked: true,
      },
    ];

    for (const featureData of defaultFeatures) {
      const existingFeature = await this.findByKey(featureData.key);

      if (existingFeature) {
        continue;
      }

      await this.featureRepository.save(
        this.featureRepository.create({
          ...featureData,
          isActive: true,
        }),
      );
    }
  }
}
