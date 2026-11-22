import { HttpStatus } from '@nestjs/common';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { FirebaseCredentialMismatchException } from '@common/firebase/exceptions/firebase.credential-mismatch.exception';

describe('FirebaseCredentialMismatchException', () => {
    describe('constructor', () => {
        it('declares the app unknown contract with its description as message', () => {
            const cause = { code: 'messaging/mismatched-credential' };

            const exception = new FirebaseCredentialMismatchException(cause);

            expect(exception).toBeInstanceOf(AppUnknownException);
            expect(exception).toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'http.serverError.internalServerError',
                message: 'Firebase credential does not match the project',
                rawError: cause,
            });
        });
    });
});
