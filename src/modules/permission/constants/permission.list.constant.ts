import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';

export const PERMISSION_DEFAULT_ORDER_BY = 'createdAt';
export const PERMISSION_DEFAULT_ORDER_DIRECTION =
    ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC;
export const PERMISSION_DEFAULT_PER_PAGE = 20;
export const PERMISSION_DEFAULT_AVAILABLE_ORDER_BY = [
    'code',
    'name',
    'createdAt',
];
export const PERMISSION_DEFAULT_AVAILABLE_SEARCH = ['code', 'name'];
export const PERMISSION_DEFAULT_IS_ACTIVE = [true, false];
export const PERMISSION_DEFAULT_GROUP = Object.values(ENUM_PERMISSION_GROUP);
