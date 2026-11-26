import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumFirebaseStatusCodeError } from '@common/firebase/enums/firebase.status-code.enum';

/** @public */
export class FirebaseUnavailableException extends AppBaseException {
    readonly module = 'firebase';
    readonly statusCode = EnumFirebaseStatusCodeError.unavailable;
    readonly statusCodeKey = EnumFirebaseStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.SERVICE_UNAVAILABLE;

    constructor(override readonly rawError: unknown = null) {
        super('firebase.error.unavailable', { rawError });
    }
}
