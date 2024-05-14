import { ENUM_USER_STATUS } from 'src/modules/user/constants/user.enum.constant';

export const USER_DEFAULT_ORDER_BY = 'signUpDate';
export const USER_DEFAULT_AVAILABLE_ORDER_BY = ['signUpDate', 'createdAt'];
export const USER_DEFAULT_STATUS = Object.values(ENUM_USER_STATUS);
export const USER_DEFAULT_BLOCKED = [true, false];
