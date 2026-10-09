import { HttpStatus } from '@nestjs/common';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';

/**
 * Route metadata key holding the flag key `@FeatureFlagProtected` gates on.
 * @public
 */
export const FeatureFlagKeyPathMetaKey = 'FeatureFlagKeyPathMetaKey';

/**
 * Feature-flag guard error kit for `@FeatureFlagProtected`.
 * @public
 */
export const DocFeatureFlagErrorResponses = {
    disabled: DocResponseError(HttpStatus.NOT_FOUND, {
        statusCode: EnumFeatureFlagStatusCodeError.disabled,
        messagePath: 'featureFlag.error.disabled',
    }),
    notConfigured: DocResponseError(HttpStatus.INTERNAL_SERVER_ERROR, {
        statusCode: EnumFeatureFlagStatusCodeError.notConfigured,
        messagePath: 'featureFlag.error.notConfigured',
    }),
} as const;

/**
 * Request header carrying the anonymous caller id a feature flag rolls out by.
 * @public
 */
export const FeatureFlagAnonymousIdHeaderName = 'x-anonymous-id';
