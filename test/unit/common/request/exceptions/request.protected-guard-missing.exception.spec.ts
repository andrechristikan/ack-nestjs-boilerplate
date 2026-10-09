import { HttpStatus } from '@nestjs/common';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { RequestProtectedGuardMissingException } from '@common/request/exceptions/request.protected-guard-missing.exception';

describe('RequestProtectedGuardMissingException', () => {
    describe('constructor', () => {
        it('declares the app unknown contract and names the decorator and the missing guard in its message', () => {
            const exception = new RequestProtectedGuardMissingException(
                'RoleProtected',
                'UserGuard'
            );

            expect(exception).toBeInstanceOf(AppUnknownException);
            expect(exception).toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'http.serverError.internalServerError',
                message: 'RoleProtected needs UserGuard applied below it',
                rawError: null,
            });
        });
    });
});
