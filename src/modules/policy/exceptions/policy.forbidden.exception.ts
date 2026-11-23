import { HttpStatus } from '@nestjs/common';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import type { IPolicyForbiddenOptions } from '@modules/policy/interfaces/policy.interface';

/** @public */
export class PolicyForbiddenException extends AppBaseException {
    readonly module = 'policy';
    readonly statusCode = EnumPolicyStatusCodeError.forbidden;
    readonly statusCodeKey = EnumPolicyStatusCodeError[this.statusCode];
    readonly httpStatus = HttpStatus.FORBIDDEN;

    constructor(options?: IPolicyForbiddenOptions) {
        super('policy.error.forbidden', {
            ...(options !== undefined && {
                metadata: {
                    missing: options.missing,
                    ...(options.reason !== undefined && {
                        reason: options.reason,
                    }),
                },
            }),
        });
    }
}
