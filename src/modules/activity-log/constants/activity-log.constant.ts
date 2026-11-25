import type { Prisma } from '@generated/prisma-client/client';
import { UserRefSelect } from '@modules/user/constants/user.constant';

/** @public */
export const ActivityLogRefSelect = {
    id: true,
} satisfies Prisma.ActivityLogSelect;

/** @public */
export const ActivityLogWithUserInclude = {
    user: { select: UserRefSelect },
} satisfies Prisma.ActivityLogInclude;
