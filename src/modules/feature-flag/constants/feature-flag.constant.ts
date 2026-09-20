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
    predefined: DocResponseError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        {
            statusCode: EnumFeatureFlagStatusCodeError.predefinedKeyNotFound,
            messagePath: 'featureFlag.error.predefinedKeyNotFound',
        },
        {
            statusCode:
                EnumFeatureFlagStatusCodeError.predefinedKeyLengthExceeded,
            messagePath: 'featureFlag.error.predefinedKeyLengthExceeded',
        },
        {
            statusCode: EnumFeatureFlagStatusCodeError.predefinedKeyEmpty,
            messagePath: 'featureFlag.error.predefinedKeyEmpty',
        }
    ),
    serviceUnavailable: DocResponseError(HttpStatus.SERVICE_UNAVAILABLE, {
        statusCode: EnumFeatureFlagStatusCodeError.serviceUnavailable,
        messagePath: 'featureFlag.error.serviceUnavailable',
    }),
} as const;
