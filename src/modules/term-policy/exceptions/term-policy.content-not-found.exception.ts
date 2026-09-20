import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';

/**
 * Raised when a term policy has no content in that language.
 * @public
 */
export class TermPolicyContentNotFoundException extends AppBaseException {
    readonly module = 'termPolicy';
    readonly statusCode = EnumTermPolicyStatusCodeError.contentNotFound;
    readonly statusCodeKey = EnumTermPolicyStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.NOT_FOUND;

    constructor() {
        super('termPolicy.error.contentNotFound');
    }
}
