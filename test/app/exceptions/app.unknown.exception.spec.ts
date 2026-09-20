import { HttpStatus } from '@nestjs/common';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';

describe('AppUnknownException', () => {
    describe('constructor', () => {
        it('declares the app module contract for an unknown failure', () => {
            const exception = new AppUnknownException(new Error('boom'));

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'http.serverError.internalServerError',
            });
        });

        it('keeps the wrapped cause in rawError', () => {
            const rawError = new Error('boom');

            const exception = new AppUnknownException(rawError);

            expect(exception.rawError).toBe(rawError);
        });

        it('keeps a non-Error cause in rawError', () => {
            const exception = new AppUnknownException('database is gone');

            expect(exception.rawError).toBe('database is gone');
        });
    });
});
