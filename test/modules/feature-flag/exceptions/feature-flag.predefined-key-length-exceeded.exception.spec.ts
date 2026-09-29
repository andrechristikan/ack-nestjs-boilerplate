import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';
import { FeatureFlagPredefinedKeyLengthExceededException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-length-exceeded.exception';

describe('FeatureFlagPredefinedKeyLengthExceededException', () => {
    describe('constructor', () => {
        it('declares the featureFlag module contract for a guard key with a second segment', () => {
            const exception =
                new FeatureFlagPredefinedKeyLengthExceededException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'featureFlag',
                statusCode:
                    EnumFeatureFlagStatusCodeError.predefinedKeyLengthExceeded,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError
                            .predefinedKeyLengthExceeded
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'featureFlag.error.predefinedKeyLengthExceeded',
            });
        });
    });
});
