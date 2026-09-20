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

        it('leaves every optional member undefined when no options are given', () => {
            const exception = new RequestValidationException([]);

            expect(exception.messageProperties).toBeUndefined();
            expect(exception.metadata).toBeUndefined();
            expect(exception.rawError).toBeUndefined();
            expect(exception.data).toBeUndefined();
        });

        it('assigns rawError from the options', () => {
            const rawError = new Error('boom');

            const exception = new AppUnknownException(rawError);

            expect(exception.rawError).toBe(rawError);
            expect(exception.messageProperties).toBeUndefined();
            expect(exception.metadata).toBeUndefined();
            expect(exception.data).toBeUndefined();
        });

        it('assigns messageProperties from the options', () => {
            const exception = new AuthTwoFactorAttemptTemporaryLockException(
                30
            );

            expect(exception.messageProperties).toEqual({
                retryAfterSeconds: 30,
            });
            expect(exception.rawError).toBeUndefined();
        });

        it('assigns metadata and data from the options', () => {
            const metadata = { source: 'serialization' };
            const data = { issues: 2 };
            const exception = new ResponseSerializationException({
                metadata,
                data,
            });

            expect(exception.metadata).toBe(metadata);
            expect(exception.data).toBe(data);
            expect(exception.messageProperties).toBeUndefined();
            expect(exception.rawError).toBeUndefined();
        });
    });
});
