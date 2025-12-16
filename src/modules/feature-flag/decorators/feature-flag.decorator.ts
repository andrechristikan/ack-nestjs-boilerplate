import { FeatureFlagKeyPathMetaKey } from '@modules/feature-flag/constants/feature-flag.constant';
import { FeatureFlagGuard } from '@modules/feature-flag/guards/feature-flag.guard';
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';

/**
 * Method decorator that applies feature flag protection to routes.
 * Validates if the specified feature flag is active before allowing access.
 *
 * @param {string} keyPath - The feature flag key path to check
 * @returns {MethodDecorator} Method decorator function
 */
export function FeatureFlagProtected(keyPath: string): MethodDecorator {
    return applyDecorators(
        UseGuards(FeatureFlagGuard),
        SetMetadata(FeatureFlagKeyPathMetaKey, keyPath)
    );
}
