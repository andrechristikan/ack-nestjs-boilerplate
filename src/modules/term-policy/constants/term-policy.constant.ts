import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

/** @public */
export const TermPolicyRequiredGuardMetaKey = 'TermPolicyRequiredGuardMetaKey';

/** @public */
export const TermPolicyDefaultRequiredTypes: EnumTermPolicyType[] = [
    EnumTermPolicyType.termsOfService,
    EnumTermPolicyType.privacy,
];

/** @public */
export const TermPolicyRefSelect = {
    id: true,
    type: true,
    version: true,
} as const;

/** @public */
export const TermPolicyAcceptanceAnalyticSelect = {
    id: true,
    userId: true,
    termPolicyId: true,
    acceptedAt: true,
    termPolicy: { select: { publishedAt: true } },
} as const;

/** @public */
export const TermPolicyAcceptanceInclude = {
    termPolicy: true,
    user: { select: UserRefSelect },
} satisfies Prisma.TermPolicyUserAcceptanceInclude;

/** @public */
export const TermPolicyAcceptanceProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumTermPolicyStatusCodeError.requiredInvalid,
        messagePath: 'termPolicy.error.requiredInvalid',
    },
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumUserStatusCodeError.guardMissing,
        messagePath: 'user.error.guardMissing',
    },
];
