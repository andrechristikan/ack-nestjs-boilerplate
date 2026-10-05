import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';

describe('FeatureFlagDisabledException', () => {
    describe('constructor', () => {
        it('declares the featureFlag module contract for a disabled or excluded flag', () => {
            const exception = new FeatureFlagDisabledException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.disabled,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.disabled
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'featureFlag.error.disabled',
            });
        });
    });
});
