import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';

export const API_KEY_DEFAULT_PER_PAGE = 20;
export const API_KEY_DEFAULT_ORDER_BY = 'createdAt';
export const API_KEY_DEFAULT_ORDER_DIRECTION =
    ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC;
export const API_KEY_DEFAULT_AVAILABLE_ORDER_BY = ['name', 'key', 'createdAt'];
export const API_KEY_DEFAULT_AVAILABLE_SEARCH = ['name', 'key'];
export const API_KEY_DEFAULT_IS_ACTIVE = [true, false];
