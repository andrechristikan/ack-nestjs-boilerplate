import { Prisma } from '@generated/prisma-client';

export const UserGuardIsVerifiedMetaKey = 'UserGuardIsVerifiedMetaKey';
export const UserStoreKey = 'UserStore';

export const UserRefSelect = {
    id: true,
    name: true,
    username: true,
    photo: true,
    createdAt: true,
    createdBy: true,
    updatedAt: true,
    updatedBy: true,
    deletedAt: true,
    deletedBy: true,
} satisfies Prisma.UserSelect;
