import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';

/**
 * Raised when a route or domain gates on a flag key no row holds: a seed bug, not a caller error.
 * @public
 */
export class FeatureFlagUnseededException extends AppBaseException {
    readonly module = 'featureFlag';
    readonly statusCode = EnumFeatureFlagStatusCodeError.unseeded;
    readonly statusCodeKey = EnumFeatureFlagStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor(key: string) {
        super('featureFlag.error.unseeded', {
            rawError: new AppUnknownException(
                null,
                `FeatureFlagUnseededException: no feature flag row for "${key}"`
            ),
        });
    }
}
