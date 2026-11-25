import { Prisma } from '@generated/prisma-client/client';
import { UserRefSelect } from '@modules/user/constants/user.constant';

/** @public */
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

/** @public */
export const SessionRefSelect = {
    id: true,
    userId: true,
} satisfies Prisma.SessionSelect;
