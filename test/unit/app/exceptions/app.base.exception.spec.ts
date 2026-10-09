import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { RequestValidationException } from '@common/request/exceptions/request.validation.exception';
import { ResponseSerializationException } from '@common/response/exceptions/response.serialization.exception';
import { AuthTwoFactorAttemptTemporaryLockException } from '@modules/auth/exceptions/auth.two-factor-attempt-temporary-lock.exception';

describe('AppBaseException', () => {
    describe('constructor', () => {
        it('carries messagePath as the Error message', () => {
            const exception = new RequestValidationException([]);

            expect(exception).toBeInstanceOf(Error);
            expect(exception.message).toBe('request.error.validation');
            expect(exception.messagePath).toBe('request.error.validation');
        });

        it('sets messageProperties, metadata and rawError to null when no options are given', () => {
            const exception = new RequestValidationException([]);

            expect(exception.messageProperties).toBeNull();
            expect(exception.metadata).toBeNull();
            expect(exception.rawError).toBeNull();
            expect(exception).not.toHaveProperty('data');
        });

        it('assigns rawError from the options', () => {
            const rawError = new Error('boom');

            const exception = new AppUnknownException(rawError);

            expect(exception.rawError).toBe(rawError);
            expect(exception.messageProperties).toBeNull();
            expect(exception.metadata).toBeNull();
            expect(exception).not.toHaveProperty('data');
        });

        it('assigns messageProperties from the options', () => {
            const exception = new AuthTwoFactorAttemptTemporaryLockException(
                30
            );

            expect(exception.messageProperties).toEqual({
                retryAfterSeconds: 30,
            });
            expect(exception.rawError).toBeNull();
        });

        it('assigns metadata from the options', () => {
            const metadata = { source: 'serialization' };
            const exception = new ResponseSerializationException({
                metadata,
            });

            expect(exception.metadata).toBe(metadata);
            expect(exception.messageProperties).toBeNull();
            expect(exception.rawError).toBeNull();
        });
    });
});
