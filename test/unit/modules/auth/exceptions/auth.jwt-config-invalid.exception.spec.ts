import { HttpStatus } from '@nestjs/common';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { AuthJwtConfigInvalidException } from '@modules/auth/exceptions/auth.jwt-config-invalid.exception';

describe('AuthJwtConfigInvalidException', () => {
    describe('constructor', () => {
        it('declares the app unknown contract with its description as message', () => {
            const cause = new Error('boom');

            const exception = new AuthJwtConfigInvalidException(
                'auth.jwt.accessToken.privateKey',
                'PKCS#8 DER private key',
                cause
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
                    'Invalid JWT configuration: auth.jwt.accessToken.privateKey must be a valid base64-encoded PKCS#8 DER private key.',
                rawError: cause,
            });
        });
    });
});
