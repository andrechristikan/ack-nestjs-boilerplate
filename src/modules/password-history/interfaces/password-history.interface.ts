import type { Prisma } from '@generated/prisma-client/client';
import { EnumPasswordHistoryType } from '@generated/prisma-client/client';
import type {
    PasswordHistoryAnalyticSelect,
    PasswordHistoryListSelect,
} from '@modules/password-history/constants/password-history.constant';

export type IPasswordHistoryList = Prisma.PasswordHistoryGetPayload<{
    select: typeof PasswordHistoryListSelect;
}>;

export type IPasswordHistoryAnalytic = Prisma.PasswordHistoryGetPayload<{
    select: typeof PasswordHistoryAnalyticSelect;
}>;

export interface IPasswordHistoryCreate {
    userId: string;
    password: string;
    type: EnumPasswordHistoryType;
    expiredAt: Date;
    createdAt: Date;
    createdBy: string;
}
