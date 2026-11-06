import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';

/** @public */
export class FeatureFlagNotConfiguredException extends AppBaseException {
    readonly module = 'featureFlag';
    readonly statusCode = EnumFeatureFlagStatusCodeError.notConfigured;
    readonly statusCodeKey = EnumFeatureFlagStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor(readonly key: string) {
        super('featureFlag.error.notConfigured', {
            rawError: new AppUnknownException(
                null,
                `FeatureFlagNotConfiguredException: no feature flag row for "${key}"`
            ),
        });
    }
}
