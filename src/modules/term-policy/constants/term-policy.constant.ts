import { HttpStatus } from '@nestjs/common';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';

/**
 * Route metadata key holding the term-policy types `@TermPolicyAcceptanceProtected` requires.
 * @public
 */
export const TermPolicyRequiredGuardMetaKey = 'TermPolicyRequiredMetaKey';

/**
 * Term-policy acceptance guard error kit for `@TermPolicyAcceptanceProtected`.
 * @public
 */
export const DocTermPolicyErrorResponses = {
    forbidden: DocResponseError(HttpStatus.FORBIDDEN, {
        statusCode: EnumTermPolicyStatusCodeError.requiredInvalid,
        messagePath: 'termPolicy.error.requiredInvalid',
    }),
} as const;
