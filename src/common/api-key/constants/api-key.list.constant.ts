import { ENUM_API_KEY_TYPE } from 'src/common/api-key/constants/api-key.enum.constant';

export const API_KEY_DEFAULT_AVAILABLE_ORDER_BY = ['createdAt'];
export const API_KEY_DEFAULT_AVAILABLE_SEARCH = ['name', 'key'];
export const API_KEY_DEFAULT_IS_ACTIVE = [true, false];
export const API_KEY_DEFAULT_TYPE = Object.values(ENUM_API_KEY_TYPE);
