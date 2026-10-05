import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';
import { FeatureFlagPredefinedKeyEmptyException } from '@modules/feature-flag/exceptions/feature-flag.predefined-key-empty.exception';

describe('FeatureFlagPredefinedKeyEmptyException', () => {
    describe('constructor', () => {
        it('declares the featureFlag module contract for an empty guard key segment', () => {
            const exception = new FeatureFlagPredefinedKeyEmptyException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.predefinedKeyEmpty,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.predefinedKeyEmpty
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'featureFlag.error.predefinedKeyEmpty',
            });
        });
    });
});
