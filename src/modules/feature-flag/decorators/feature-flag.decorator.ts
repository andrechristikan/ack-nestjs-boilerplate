import { FEATURE_FLAG_IS_ACTIVE_META_KEY } from '@modules/feature-flag/constants/feature-flag.constant';
import { FeatureFlagGuard } from '@modules/feature-flag/guards/feature-flag.guard';
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';

// TODO: 0 ADD THIS TO EACH ENDPOINT THAT NEEDS FEATURE FLAG CHECK
export function FeatureFlag(key: string): MethodDecorator {
    return applyDecorators(
        UseGuards(FeatureFlagGuard),
        SetMetadata(FEATURE_FLAG_IS_ACTIVE_META_KEY, key)
    );
}
