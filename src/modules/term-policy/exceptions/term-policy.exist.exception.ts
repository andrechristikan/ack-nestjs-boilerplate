import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';

/**
 * Raised when a term policy with the same type and version exists.
 * @public
 */
export class TermPolicyExistException extends AppBaseException {
    readonly module = 'termPolicy';
    readonly statusCode = EnumTermPolicyStatusCodeError.exist;
    readonly statusCodeKey = EnumTermPolicyStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.CONFLICT;

    constructor() {
        super('termPolicy.error.exist');
    }
}
