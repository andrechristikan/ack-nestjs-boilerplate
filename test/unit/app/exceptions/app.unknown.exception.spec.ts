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

        it('keeps the messagePath as message when no description is given', () => {
            const exception = new AppUnknownException(null);

            expect(exception.message).toBe(
                'http.serverError.internalServerError'
            );
        });

        it('carries the developer-facing description as message and keeps the messagePath', () => {
            const exception = new AppUnknownException(
                null,
                'Firebase private key could not be normalized'
            );

            expect(exception.message).toBe(
                'Firebase private key could not be normalized'
            );
            expect(exception.messagePath).toBe(
                'http.serverError.internalServerError'
            );
            expect(exception.rawError).toBeNull();
        });

        it('keeps the cause in rawError next to the description', () => {
            const rawError = new Error('boom');

            const exception = new AppUnknownException(rawError, 'init failed');

            expect(exception.rawError).toBe(rawError);
            expect(exception.message).toBe('init failed');
        });
    });
});
