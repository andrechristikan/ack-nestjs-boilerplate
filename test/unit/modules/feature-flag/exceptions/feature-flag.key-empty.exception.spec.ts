import { HttpStatus } from '@nestjs/common';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { FeatureFlagKeyEmptyException } from '@modules/feature-flag/exceptions/feature-flag.key-empty.exception';

describe('FeatureFlagKeyEmptyException', () => {
    describe('constructor', () => {
        it('declares the app unknown contract with its description as message', () => {
            const exception = new FeatureFlagKeyEmptyException();

            expect(exception).toBeInstanceOf(AppUnknownException);
            expect(exception).toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'http.serverError.internalServerError',
                message: 'FeatureFlagProtected needs a non-empty key',
                rawError: null,
            });
        });
    });
});
