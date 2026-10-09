import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';

/**
 * Raised when a publish notification job for the term policy is still waiting, delayed, or running.
 * @public
 */
export class TermPolicyPublishInProgressException extends AppBaseException {
    readonly module = 'termPolicy';
    readonly statusCode = EnumTermPolicyStatusCodeError.publishInProgress;
    readonly statusCodeKey = EnumTermPolicyStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.CONFLICT;

    constructor() {
        super('termPolicy.error.publishInProgress');
    }
}
