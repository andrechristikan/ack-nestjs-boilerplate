import { ENUM_TERM_POLICY_STATUS, ENUM_TERM_POLICY_TYPE } from '@prisma/client';

export const TERM_POLICY_DEFAULT_STATUS = Object.values(
    ENUM_TERM_POLICY_STATUS
);
export const TERM_POLICY_DEFAULT_TYPE = Object.values(ENUM_TERM_POLICY_TYPE);
export const TERM_POLICY_DEFAULT_AVAILABLE_ORDER_BY = [
    'publishedAt',
    'version',
];
