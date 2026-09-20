import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';

/**
 * Raised when the user has already accepted the term policy.
 * @public
 */
export class TermPolicyAlreadyAcceptedException extends AppBaseException {
    readonly module = 'termPolicy';
    readonly statusCode = EnumTermPolicyStatusCodeError.alreadyAccepted;
    readonly statusCodeKey = EnumTermPolicyStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.CONFLICT;

    constructor() {
        super('termPolicy.error.alreadyAccepted');
    }
}
