import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';
import { FeatureFlagPredefinedKeyNotFoundException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-not-found.exception';

describe('FeatureFlagPredefinedKeyNotFoundException', () => {
    describe('constructor', () => {
        it('declares the featureFlag module contract for an unregistered guard key', () => {
            const exception = new FeatureFlagPredefinedKeyNotFoundException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'featureFlag',
                statusCode:
                    EnumFeatureFlagStatusCodeError.predefinedKeyNotFound,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.predefinedKeyNotFound
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'featureFlag.error.predefinedKeyNotFound',
            });
        });
    });
});
