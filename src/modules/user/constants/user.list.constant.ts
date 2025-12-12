import { EnumUserStatus } from '@prisma/client';

export const USER_DEFAULT_AVAILABLE_SEARCH = ['name', 'username', 'email'];
export const USER_DEFAULT_STATUS = Object.values(EnumUserStatus);
