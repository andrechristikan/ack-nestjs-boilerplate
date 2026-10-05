import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFirebaseStatusCodeError } from '@common/firebase/enums/firebase.status-code.enum';
import { FirebaseChunkSizeInvalidException } from '@common/firebase/exceptions/firebase.chunk-size-invalid.exception';

describe('FirebaseChunkSizeInvalidException', () => {
    describe('constructor', () => {
        it('declares the firebase module contract for a chunk size outside the allowed range', () => {
            const exception = new FirebaseChunkSizeInvalidException();

            expect(exception).toBeInstanceOf(AppBaseException);
            expect(exception).toMatchObject({
                module: 'firebase',
                statusCode: EnumFirebaseStatusCodeError.chunkSizeInvalid,
                statusCodeKey:
                    EnumFirebaseStatusCodeError[
                        EnumFirebaseStatusCodeError.chunkSizeInvalid
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'firebase.error.chunkSizeInvalid',
            });
        });
    });
});
