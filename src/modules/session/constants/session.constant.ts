import { Prisma } from '@generated/prisma-client/client';
import type { ISessionLogin } from '@modules/session/interfaces/session.interface';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import { z } from 'zod';

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
export const SessionUserRefSelect = {
    id: true,
    userId: true,
} satisfies Prisma.SessionSelect;

/** @public */
export const SessionLoginSelect = {
    jtiDigest: true,
} satisfies Prisma.SessionSelect;

/** @public */
export const SessionLoginCacheSchema = z.object({
    jtiDigest: z.string(),
}) satisfies z.ZodType<ISessionLogin>;
