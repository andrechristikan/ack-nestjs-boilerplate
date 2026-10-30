import type { Prisma } from '@generated/prisma-client/client';
import { EnumPasswordHistoryType } from '@generated/prisma-client/client';
import type { PasswordHistoryListSelect } from '@modules/password-history/constants/password-history.constant';

export type IPasswordHistoryList = Prisma.PasswordHistoryGetPayload<{
    select: typeof PasswordHistoryListSelect;
}>;

export interface IPasswordHistoryAnalytic {
    id: string;
    userId: string;
    type: EnumPasswordHistoryType;
    createdAt: Date;
}

export interface IPasswordHistoryCreate {
    userId: string;
    password: string;
    type: EnumPasswordHistoryType;
    expiredAt: Date;
    createdAt: Date;
    createdBy: string;
}
