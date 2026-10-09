import {
    DocFeatureFlagErrorResponses,
    FeatureFlagKeyPathMetaKey,
} from '@modules/feature-flag/constants/feature-flag.constant';
import { FeatureFlagGuard } from '@modules/feature-flag/guards/feature-flag.guard';
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { FeatureFlagKeyEmptyException } from '@modules/feature-flag/exceptions/feature-flag.key-empty.exception';
import { FeatureFlagKeyNestedException } from '@modules/feature-flag/exceptions/feature-flag.key-nested.exception';

/**
 * Guards a route behind a feature flag; `keyPath` is a bare flag key.
 * @public
 */
export function FeatureFlagProtected(keyPath: string): MethodDecorator {
    const segments = keyPath.split('.');
    if (segments.some(segment => segment.length === 0)) {
        throw new FeatureFlagKeyEmptyException();
    } else if (segments.length > 1) {
        throw new FeatureFlagKeyNestedException();
    }

    return applyDecorators(
        UseGuards(FeatureFlagGuard),
        SetMetadata(FeatureFlagKeyPathMetaKey, keyPath),
        DocFeatureFlagErrorResponses.disabled,
        DocFeatureFlagErrorResponses.notConfigured
    );
}
