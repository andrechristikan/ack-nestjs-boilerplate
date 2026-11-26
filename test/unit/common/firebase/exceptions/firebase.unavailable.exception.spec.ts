import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFirebaseStatusCodeError } from '@common/firebase/enums/firebase.status-code.enum';
import { FirebaseUnavailableException } from '@common/firebase/exceptions/firebase.unavailable.exception';

describe('FirebaseUnavailableException', () => {
    describe('constructor', () => {
        it('declares the firebase module contract for an unreachable FCM', () => {
            const exception = new FirebaseUnavailableException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'firebase',
                statusCode: 52900,
                statusCodeKey: 'unavailable',
                httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
                messagePath: 'firebase.error.unavailable',
                rawError: null,
            });
            expect(exception.statusCode).toBe(
                EnumFirebaseStatusCodeError.unavailable
            );
        });

        it('carries the caught error as rawError and cause', () => {
            const error = new Error('fcm unreachable');

            const exception = new FirebaseUnavailableException(error);

            expect(exception).toMatchObject({
                rawError: error,
                cause: error,
            });
        });
    });
});
