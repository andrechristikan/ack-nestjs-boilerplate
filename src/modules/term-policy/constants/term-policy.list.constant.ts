import { EnumTermPolicyStatus, EnumTermPolicyType } from '@generated/prisma-client';

export const TermPolicyDefaultStatus = Object.values(EnumTermPolicyStatus);
export const TermPolicyDefaultType = Object.values(EnumTermPolicyType);
export const TermPolicyDefaultAvailableOrderBy = ['publishedAt', 'version'];
