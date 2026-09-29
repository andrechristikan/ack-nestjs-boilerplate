import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';
import { FeatureFlagPredefinedKeyTypeInvalidException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-type-invalid.exception';

describe('FeatureFlagPredefinedKeyTypeInvalidException', () => {
    describe('constructor', () => {
        it('declares the featureFlag module contract for a non-boolean metadata sub-key', () => {
            const exception =
                new FeatureFlagPredefinedKeyTypeInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'featureFlag',
                statusCode:
                    EnumFeatureFlagStatusCodeError.predefinedKeyTypeInvalid,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.predefinedKeyTypeInvalid
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'featureFlag.error.predefinedKeyTypeInvalid',
            });
        });
    });
});
