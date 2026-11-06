import { Prisma } from '@generated/prisma-client/client';
import { UserRefSelect } from '@modules/user/constants/user.constant';

/** @public */
export const PasswordHistoryListSelect = {
    id: true,
    userId: true,
    type: true,
    expiredAt: true,
    createdAt: true,
    createdBy: true,
    user: {
        select: UserRefSelect,
    },
} satisfies Prisma.PasswordHistorySelect;
