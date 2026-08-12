import { EnumUserStatus } from '@generated/prisma-client';

export const UserDefaultAvailableSearch = ['name', 'username', 'email'];
export const UserDefaultAvailableOrderBy = ['createdAt', 'name'];
export const UserDefaultStatus = Object.values(EnumUserStatus);
