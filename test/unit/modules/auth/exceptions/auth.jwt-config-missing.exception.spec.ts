import { HttpStatus } from '@nestjs/common';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AuthJwtConfigMissingException } from '@modules/auth/exceptions/auth.jwt-config-missing.exception';

describe('AuthJwtConfigMissingException', () => {
    describe('constructor', () => {
        it('declares the app unknown contract with its description as message', () => {
            const exception = new AuthJwtConfigMissingException(
                'auth.jwt.accessToken.privateKey'
            );

            expect(exception).toBeInstanceOf(AppUnknownException);
            expect(exception).toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'http.serverError.internalServerError',
                message:
                    'Invalid JWT configuration: auth.jwt.accessToken.privateKey is missing.',
                rawError: null,
            });
        });
    });
});
