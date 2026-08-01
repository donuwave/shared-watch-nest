import { SetMetadata } from '@nestjs/common';
import type { FeatureKey } from '../entity/feature/types/feature-key';

export const FEATURE_KEY = 'feature';
export const Feature = (feature: FeatureKey) =>
  SetMetadata(FEATURE_KEY, feature);
