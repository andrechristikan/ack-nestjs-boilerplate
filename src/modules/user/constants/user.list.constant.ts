import { EnumUserStatus } from '@prisma/client';

export const UserDefaultAvailableSearch = ['name', 'username', 'email'];
export const UserDefaultStatus = Object.values(EnumUserStatus);
