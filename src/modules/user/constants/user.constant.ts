import { Prisma } from '@generated/prisma-client/client';

/**
 * Route metadata key holding whether `@UserProtected` requires a verified user.
 * @public
 */
export const UserGuardIsVerifiedMetaKey = 'UserGuardIsVerifiedMetaKey';
/**
 * Request-store key holding the loaded current user.
 * @public
 */
export const UserStoreKey = 'UserStore';

/**
 * Prisma select of the public user reference embedded in other records.
 * @public
 */
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
