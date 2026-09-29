import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';
import { FeatureFlagServiceUnavailableException } from '@modules/feature-flag/exceptions/feature-flag.service-unavailable.exception';

describe('FeatureFlagServiceUnavailableException', () => {
    describe('constructor', () => {
        it('declares the featureFlag module contract for a disabled or excluded flag', () => {
            const exception = new FeatureFlagServiceUnavailableException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.serviceUnavailable,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.serviceUnavailable
                    ],
                httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
                messagePath: 'featureFlag.error.serviceUnavailable',
            });
        });
    });
});
