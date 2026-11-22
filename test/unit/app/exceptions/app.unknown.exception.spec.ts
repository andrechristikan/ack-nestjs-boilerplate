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

        it('chains the wrapped error as the standard cause', () => {
            const rawError = new Error('boom');

            const exception = new AppUnknownException(rawError, 'init failed');

            expect(exception.cause).toBe(rawError);
        });

        it('chains the wrapped error as the cause when no description is given', () => {
            const rawError = new Error('boom');

            const exception = new AppUnknownException(rawError);

            expect(exception.cause).toBe(rawError);
        });

        it('keeps the description on the exception and null when none is given', () => {
            expect(
                new AppUnknownException(null, 'init failed').description
            ).toBe('init failed');
            expect(new AppUnknownException(null).description).toBeNull();
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
