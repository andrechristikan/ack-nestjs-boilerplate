import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client';

export const TermPolicyDefaultStatus = Object.values(EnumTermPolicyStatus);
export const TermPolicyDefaultType = Object.values(EnumTermPolicyType);
/**
 * Cursor-route allow-list. `version` is written at create and never updated; `publishedAt` is
 * written only when a draft is published, and the cursor route lists published rows only, so
 * neither key moves a row mid-scroll.
 */
export const TermPolicyDefaultAvailableOrderBy = ['publishedAt', 'version'];
export const TermPolicyAcceptanceDefaultAvailableOrderBy = ['createdAt'];
