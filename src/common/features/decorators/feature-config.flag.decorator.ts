import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { FEATURE_CONFIG_FLAG_META_KEY } from '@common/features/constants/feature-config.flag.constant';
import { FeatureConfigFlagGuard } from '@common/features/guards/feature-config.flag.guard.service';

export function FeatureConfigFlag(
  key: string,
): MethodDecorator {
  return applyDecorators(
    UseGuards(FeatureConfigFlagGuard),
    SetMetadata(FEATURE_CONFIG_FLAG_META_KEY, key),
  );
}