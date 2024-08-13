import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';

export const ROLE_DEFAULT_AVAILABLE_SEARCH = ['name'];
export const ROLE_DEFAULT_IS_ACTIVE = [true, false];
export const ROLE_DEFAULT_POLICY_ROLE_TYPE = Object.values(
    ENUM_POLICY_ROLE_TYPE
);
