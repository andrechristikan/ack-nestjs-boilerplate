import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';

/**
 * Raised when a feature flag is disabled or its rollout excludes the caller.
 * @public
 */
export class FeatureFlagDisabledException extends AppBaseException {
    readonly module = 'featureFlag';
    readonly statusCode = EnumFeatureFlagStatusCodeError.disabled;
    readonly statusCodeKey = EnumFeatureFlagStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.NOT_FOUND;

    constructor() {
        super('featureFlag.error.disabled');
    }
}
