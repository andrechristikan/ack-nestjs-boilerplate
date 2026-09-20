import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';

/**
 * Raised when a feature flag metadata value checked by a guard is not boolean.
 * @public
 */
export class FeatureFlagPredefinedKeyTypeInvalidException extends AppBaseException {
    readonly module = 'featureFlag';
    readonly statusCode =
        EnumFeatureFlagStatusCodeError.predefinedKeyTypeInvalid;
    readonly statusCodeKey = EnumFeatureFlagStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor() {
        super('featureFlag.error.predefinedKeyTypeInvalid');
    }
}
