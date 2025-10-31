import { FEATURE_FLAG_IS_ACTIVE_META_KEY } from '@modules/feature-flag/constants/feature-flag.constant';
import { FeatureFlagGuard } from '@modules/feature-flag/guards/feature-flag.guard';
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';

/**
 * Method decorator that applies feature flag protection to routes.
 * Validates if the specified feature flag is active before allowing access.
 *
 * @param {string} key - The feature flag key to check
 * @returns {MethodDecorator} Method decorator function
 */
export function FeatureFlag(key: string): MethodDecorator {
    return applyDecorators(
        UseGuards(FeatureFlagGuard),
        SetMetadata(FEATURE_FLAG_IS_ACTIVE_META_KEY, key)
    );
}
