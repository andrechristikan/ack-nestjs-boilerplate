import { Prisma } from '@generated/prisma-client/client';
import { UserRefSelect } from '@modules/user/constants/user.constant';

/**
 * Injection token of the cache manager the session cache stores logins in.
 * @public
 */
export const SessionCacheProvider = 'SessionCacheProvider';

/**
 * Keys a per-user session purge asks Redis to examine on each `SCAN` call.
 * @public
 */
export const SessionCachePurgeScanCount = 1000;

/**
 * Columns a session list read returns; the token identifier is never among them.
 * @public
 */
export const SessionListSelect = {
    id: true,
    userId: true,
    deviceOwnershipId: true,
    ipAddress: true,
    userAgent: true,
    geoLocation: true,
    expiredAt: true,
    revokedAt: true,
    isRevoked: true,
    revokedById: true,
    createdAt: true,
    createdBy: true,
    updatedAt: true,
    updatedBy: true,
    user: {
        select: UserRefSelect,
    },
    revokedBy: {
        select: UserRefSelect,
    },
} satisfies Prisma.SessionSelect;
