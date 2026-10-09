import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';
import { FeatureFlagUnseededException } from '@modules/feature-flag/exceptions/feature-flag.unseeded.exception';

describe('FeatureFlagUnseededException', () => {
    describe('constructor', () => {
        it('declares the featureFlag module contract for a gate key no row holds', () => {
            const exception = new FeatureFlagUnseededException(
                'loginWithGoogle'
            );

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.unseeded,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.unseeded
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'featureFlag.error.unseeded',
            });
        });

        it('names the missing flag key in the description inside rawError', () => {
            const exception = new FeatureFlagUnseededException(
                'loginWithGoogle'
            );

            expect(exception.rawError).toBeInstanceOf(AppUnknownException);
            expect((exception.rawError as AppUnknownException).message).toBe(
                'FeatureFlagUnseededException: no feature flag row for "loginWithGoogle"'
            );
        });
    });
});
