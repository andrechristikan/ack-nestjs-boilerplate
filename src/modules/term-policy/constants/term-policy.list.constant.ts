import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    Prisma,
} from '@generated/prisma-client/client';

/** @public */
export const TermPolicyDefaultStatus = Object.values(EnumTermPolicyStatus);

/** @public */
export const TermPolicyDefaultType = Object.values(EnumTermPolicyType);

/** @public */
export const TermPolicyDefaultAvailableOrderBy = [
    Prisma.TermPolicyScalarFieldEnum.publishedAt,
    Prisma.TermPolicyScalarFieldEnum.version,
] as const satisfies ReadonlyArray<Prisma.TermPolicyScalarFieldEnum>;

/** @public */
export const TermPolicyAcceptanceDefaultAvailableOrderBy = [
    Prisma.TermPolicyUserAcceptanceScalarFieldEnum.createdAt,
] as const satisfies ReadonlyArray<Prisma.TermPolicyUserAcceptanceScalarFieldEnum>;

/** @public */
export const TermPolicyPublicListCursorScope =
    'TermPolicyPublicListCursorScope';

/** @public */
export const TermPolicyAcceptanceSharedListCursorScope =
    'TermPolicyAcceptanceSharedListCursorScope';
