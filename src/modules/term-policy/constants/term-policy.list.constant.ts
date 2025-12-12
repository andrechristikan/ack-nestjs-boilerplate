import { EnumTermPolicyStatus, EnumTermPolicyType } from '@prisma/client';

export const TERM_POLICY_DEFAULT_STATUS = Object.values(EnumTermPolicyStatus);
export const TERM_POLICY_DEFAULT_TYPE = Object.values(EnumTermPolicyType);
export const TERM_POLICY_DEFAULT_AVAILABLE_ORDER_BY = [
    'publishedAt',
    'version',
];
