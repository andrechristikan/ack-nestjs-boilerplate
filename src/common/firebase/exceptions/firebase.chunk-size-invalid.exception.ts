import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFirebaseStatusCodeError } from '@common/firebase/enums/firebase.status-code.enum';

/**
 * Raised when a multicast push is asked to chunk tokens outside 1 to `FirebaseMaxSendPushBatchSize`.
 * @public
 */
export class FirebaseChunkSizeInvalidException extends AppBaseException {
    readonly module = 'firebase';
    readonly statusCode = EnumFirebaseStatusCodeError.chunkSizeInvalid;
    readonly statusCodeKey = EnumFirebaseStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

    constructor() {
        super('firebase.error.chunkSizeInvalid');
    }
}
