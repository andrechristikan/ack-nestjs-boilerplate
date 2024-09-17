import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { ENUM_USER_STATUS } from 'src/modules/user/enums/user.enum';

export const USER_DEFAULT_AVAILABLE_SEARCH = ['name', 'email'];
export const USER_DEFAULT_STATUS = Object.values(ENUM_USER_STATUS);

export const USER_DEFAULT_POLICY_ROLE_TYPE = Object.values(
    ENUM_POLICY_ROLE_TYPE
);
