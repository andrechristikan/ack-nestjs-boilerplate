import { HttpStatus } from '@nestjs/common';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { FirebaseInitializationFailedException } from '@common/firebase/exceptions/firebase.initialization-failed.exception';

describe('FirebaseInitializationFailedException', () => {
    describe('constructor', () => {
        it('declares the app unknown contract with its description as message', () => {
            const cause = new Error('boom');

            const exception = new FirebaseInitializationFailedException(cause);

            expect(exception).toBeInstanceOf(AppUnknownException);
            expect(exception).toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'http.serverError.internalServerError',
                message: 'Failed to initialize Firebase Admin SDK',
                rawError: cause,
            });
        });
    });
});
