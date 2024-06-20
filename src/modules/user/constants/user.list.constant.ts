import { ENUM_USER_STATUS } from 'src/modules/user/constants/user.enum.constant';

export const USER_DEFAULT_AVAILABLE_SEARCH = ['name', 'email'];
export const USER_DEFAULT_STATUS = Object.values(ENUM_USER_STATUS);
export const USER_DEFAULT_BLOCKED = [true, false];
