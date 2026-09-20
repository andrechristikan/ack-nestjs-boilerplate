import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';

/**
 * Raised when the requested feature flag does not exist.
 * @public
 */
export class FeatureFlagNotFoundException extends AppBaseException {
    readonly module = 'featureFlag';
    readonly statusCode = EnumFeatureFlagStatusCodeError.notFound;
    readonly statusCodeKey = EnumFeatureFlagStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.NOT_FOUND;

    constructor() {
        super('featureFlag.error.notFound');
    }
}
