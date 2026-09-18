import { Prisma } from '@generated/prisma-client/client';
import { UserRefSelect } from '@modules/user/constants/user.constant';

/**
 * Columns a password history list read returns; the stored hash is never among them.
 * @public
 */
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
