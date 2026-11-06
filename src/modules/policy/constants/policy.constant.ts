import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

/**
 * Route metadata key holding the policy abilities `@PolicyProtected` requires.
 * @public
 */
export const PolicyRequiredMetaKey = 'PolicyRequiredMetaKey';

/**
 * Request-store key holding the caller's role policies, set by the role guard and read by the policy guard.
 * @public
 */
export const PolicyStoreKey = 'PolicyStoreKey';

/**
 * Error entries `@PolicyProtected` documents: the policy forbidden error and the missing user and policy stores.
 * @public
 */
export const PolicyProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumPolicyStatusCodeError.forbidden,
        messagePath: 'policy.error.forbidden',
    },
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumUserStatusCodeError.guardMissing,
        messagePath: 'user.error.guardMissing',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumPolicyStatusCodeError.guardMissing,
        messagePath: 'policy.error.guardMissing',
    },
];
