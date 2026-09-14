import { Prisma } from '@generated/prisma-client';

export const UserGuardIsVerifiedMetaKey = 'UserGuardIsVerifiedMetaKey';
export const UserStoreKey = 'UserStore';

/**
 * Matches a `TwoFactorBackupCode` the user can still spend — a consumed code is never read back.
 */
export const TwoFactorActiveBackupCodesFilter: Prisma.TwoFactorBackupCodeWhereInput =
    {
        usedAt: null,
    };

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
