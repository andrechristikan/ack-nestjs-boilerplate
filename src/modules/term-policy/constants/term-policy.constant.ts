import { HttpStatus } from '@nestjs/common';
import { DocResponseError } from '@common/doc/decorators/doc.decorator';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';

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
 * Term-policy error kit: `forbidden` for `@TermPolicyAcceptanceProtected`, `contentSizeExceeded` for the content presign route, `requiredNotPublished` for the sign-up routes.
 * @public
 */
export const DocTermPolicyErrorResponses = {
    forbidden: DocResponseError(HttpStatus.FORBIDDEN, {
        statusCode: EnumTermPolicyStatusCodeError.requiredInvalid,
        messagePath: 'termPolicy.error.requiredInvalid',
    }),
    contentSizeExceeded: DocResponseError(HttpStatus.BAD_REQUEST, {
        statusCode: EnumTermPolicyStatusCodeError.contentSizeExceeded,
        messagePath: 'termPolicy.error.contentSizeExceeded',
    }),
    requiredNotPublished: DocResponseError(HttpStatus.INTERNAL_SERVER_ERROR, {
        statusCode: EnumTermPolicyStatusCodeError.requiredNotPublished,
        messagePath: 'termPolicy.error.requiredNotPublished',
    }),
} as const;
