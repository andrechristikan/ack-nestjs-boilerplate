import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';

/**
 * Term-policy statuses the admin term-policy list filter accepts.
 * @public
 */
export const TermPolicyDefaultStatus = Object.values(EnumTermPolicyStatus);

/**
 * Term-policy types the term-policy list filters accept.
 * @public
 */
export const TermPolicyDefaultType = Object.values(EnumTermPolicyType);

/**
 * Sort fields the admin offset and public cursor term-policy lists accept. `version` is written
 * at create and never updated; `publishedAt` is written only when a draft is published, and the
 * cursor route lists published rows only, so neither key moves a row mid-scroll.
 * @public
 */
export const TermPolicyDefaultAvailableOrderBy = ['publishedAt', 'version'];

/**
 * Sort fields the term-policy acceptance list accepts.
 * @public
 */
export const TermPolicyAcceptanceDefaultAvailableOrderBy = ['createdAt'];
