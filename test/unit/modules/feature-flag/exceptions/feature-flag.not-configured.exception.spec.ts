import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';
import { FeatureFlagNotConfiguredException } from '@modules/feature-flag/exceptions/feature-flag.not-configured.exception';

describe('FeatureFlagNotConfiguredException', () => {
    describe('constructor', () => {
        it('declares the featureFlag module contract for a gate key no row holds', () => {
            const exception = new FeatureFlagNotConfiguredException(
                'loginWithGoogle'
            );

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.notConfigured,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.notConfigured
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'featureFlag.error.notConfigured',
            });
        });

        it('names the missing flag key in the description inside rawError', () => {
            const exception = new FeatureFlagNotConfiguredException(
                'loginWithGoogle'
            );

            expect(exception.rawError).toBeInstanceOf(AppUnknownException);
            expect((exception.rawError as AppUnknownException).message).toBe(
                'FeatureFlagNotConfiguredException: no feature flag row for "loginWithGoogle"'
            );
        });
    });
});
