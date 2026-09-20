import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';

/**
 * Raised when a feature flag guard key has an empty segment.
 * @public
 */
export class FeatureFlagPredefinedKeyEmptyException extends AppBaseException {
    readonly module = 'featureFlag';
    readonly statusCode = EnumFeatureFlagStatusCodeError.predefinedKeyEmpty;
    readonly statusCodeKey = EnumFeatureFlagStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor() {
        super('featureFlag.error.predefinedKeyEmpty');
    }
}
