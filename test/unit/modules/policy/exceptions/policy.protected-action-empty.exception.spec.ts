import { HttpStatus } from '@nestjs/common';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { PolicyProtectedActionEmptyException } from '@modules/policy/exceptions/policy.protected-action-empty.exception';

describe('PolicyProtectedActionEmptyException', () => {
    describe('constructor', () => {
        it('declares the app unknown contract with its description as message', () => {
            const exception = new PolicyProtectedActionEmptyException();

            expect(exception).toBeInstanceOf(AppUnknownException);
            expect(exception).toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'http.serverError.internalServerError',
                message: 'PolicyProtected needs at least one action per policy',
                rawError: null,
            });
        });
    });
});
