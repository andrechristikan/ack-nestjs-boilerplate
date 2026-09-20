import {
    DocFeatureFlagErrorResponses,
    FeatureFlagKeyPathMetaKey,
} from '@modules/feature-flag/constants/feature-flag.constant';
import { FeatureFlagGuard } from '@modules/feature-flag/guards/feature-flag.guard';
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';

/**
 * Guards a route behind a feature flag; `keyPath` is a bare flag key.
 * @public
 */
export function FeatureFlagProtected(keyPath: string): MethodDecorator {
    return applyDecorators(
        UseGuards(FeatureFlagGuard),
        SetMetadata(FeatureFlagKeyPathMetaKey, keyPath),
        DocFeatureFlagErrorResponses.predefined,
        DocFeatureFlagErrorResponses.serviceUnavailable
    );
}
