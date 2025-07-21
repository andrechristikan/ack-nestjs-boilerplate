import { ENUM_TERM_POLICY_STATUS } from '@modules/term-policy/enums/term-policy.enum';

export const TERM_POLICY_DEFAULT_STATUS = Object.values(
    ENUM_TERM_POLICY_STATUS
);
export const TERM_POLICY_DEFAULT_AVAILABLE_ORDER_BY = [
    'version',
    'publishedAt',
];

export const TERM_POLICY_ACCEPTANCE_DEFAULT_AVAILABLE_ORDER_BY = ['acceptedAt'];
