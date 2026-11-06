import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

/** @public */
export const PolicyRequiredMetaKey = 'PolicyRequiredMetaKey';

/** @public */
export const PolicyStoreKey = 'PolicyStoreKey';

/** @public */
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
