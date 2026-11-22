import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserCredentialInvalidException } from '@modules/user/exceptions/user.credential-invalid.exception';

describe('UserCredentialInvalidException', () => {
    describe('constructor', () => {
        it('declares the user module contract', () => {
            const exception = new UserCredentialInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'user',
                statusCode: 51025,
                statusCodeKey: 'credentialInvalid',
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'user.error.credentialInvalid',
            });
            expect(EnumUserStatusCodeError[exception.statusCode]).toBe(
                'credentialInvalid'
            );
        });
    });
});
