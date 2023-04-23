import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { ENUM_ROLE_TYPE } from 'src/modules/role/constants/role.enum.constant';

export const USER_DEFAULT_PER_PAGE = 20;
export const USER_DEFAULT_ORDER_BY = 'createdAt';
export const USER_DEFAULT_ORDER_DIRECTION =
    ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC;
export const USER_DEFAULT_AVAILABLE_ORDER_BY = [
    'username',
    'firstName',
    'lastName',
    'email',
    'mobileNumber',
    'createdAt',
];
export const USER_DEFAULT_AVAILABLE_SEARCH = [
    'username',
    'firstName',
    'lastName',
    'email',
    'mobileNumber',
];

export const USER_DEFAULT_IS_ACTIVE = [true, false];
export const USER_DEFAULT_BLOCKED = [true, false];
export const USER_DEFAULT_INACTIVE_PERMANENT = [true, false];
export const USER_DEFAULT_ROLE_TYPE = Object.values(ENUM_ROLE_TYPE);
