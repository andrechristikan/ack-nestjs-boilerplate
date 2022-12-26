import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';

export const ROLE_DEFAULT_SORT = 'createdAt@asc';
export const ROLE_DEFAULT_PER_PAGE = 20;
export const ROLE_DEFAULT_AVAILABLE_SORT = ['name', 'createdAt'];
export const ROLE_DEFAULT_AVAILABLE_SEARCH = ['name'];
export const ROLE_DEFAULT_IS_ACTIVE = [true, false];
export const ROLE_DEFAULT_ACCESS_FOR = Object.values(ENUM_AUTH_ACCESS_FOR);
