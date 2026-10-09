import { HttpStatus } from '@nestjs/common';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { PolicyProtectedEmptyException } from '@modules/policy/exceptions/policy.protected-empty.exception';

describe('PolicyProtectedEmptyException', () => {
    describe('constructor', () => {
        it('declares the app unknown contract with its description as message', () => {
            const exception = new PolicyProtectedEmptyException();

            expect(exception).toBeInstanceOf(AppUnknownException);
            expect(exception).toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'http.serverError.internalServerError',
                message: 'PolicyProtected needs at least one policy',
                rawError: null,
            });
        });
    });
});
