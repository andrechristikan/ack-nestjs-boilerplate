import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';

/**
 * Route metadata key holding the flag key `@FeatureFlagProtected` gates on.
 * @public
 */
export const FeatureFlagKeyPathMetaKey = 'FeatureFlagKeyPathMetaKey';

/**
 * Request header carrying the anonymous caller id a feature flag rolls out by.
 * @public
 */
export const FeatureFlagAnonymousIdHeaderName = 'x-anonymous-id';

/**
 * Error entries `@FeatureFlagProtected` documents: the disabled flag and the flag not configured.
 * @public
 */
export const FeatureFlagProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.NOT_FOUND,
        statusCode: EnumFeatureFlagStatusCodeError.disabled,
        messagePath: 'featureFlag.error.disabled',
    },
    {
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        statusCode: EnumFeatureFlagStatusCodeError.notConfigured,
        messagePath: 'featureFlag.error.notConfigured',
    },
];
