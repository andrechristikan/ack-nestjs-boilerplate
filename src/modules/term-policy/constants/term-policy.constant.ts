import { HttpStatus } from '@nestjs/common';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';

/**
 * Route metadata key holding the term-policy types `@TermPolicyAcceptanceProtected` requires.
 * @public
 */
export const TermPolicyRequiredGuardMetaKey = 'TermPolicyRequiredGuardMetaKey';

/**
 * Term policy types a `@TermPolicyAcceptanceProtected()` route requires when it names none, that sign-up accepts, and that the seed publishes.
 * @public
 */
export const TermPolicyDefaultRequiredTypes: EnumTermPolicyType[] = [
    EnumTermPolicyType.termsOfService,
    EnumTermPolicyType.privacy,
];

/**
 * Select for the policy reference the acceptance checks compare: id, type, and version.
 * @public
 */
export const TermPolicyRefSelect = {
    id: true,
    type: true,
    version: true,
} as const;

/**
 * Select for the acceptance analytic read: the acceptance and the publish time of its policy.
 * @public
 */
export const TermPolicyAcceptanceAnalyticSelect = {
    id: true,
    userId: true,
    termPolicyId: true,
    acceptedAt: true,
    termPolicy: { select: { publishedAt: true } },
} as const;

/**
 * Include for a user's acceptance rows: the accepted policy and the accepting user reference.
 * @public
 */
export const TermPolicyAcceptanceInclude = {
    termPolicy: true,
    user: { select: UserRefSelect },
} satisfies Prisma.TermPolicyUserAcceptanceInclude;

/**
 * Error entries `@TermPolicyAcceptanceProtected` documents: the missing acceptance and the missing user store.
 * @public
 */
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
