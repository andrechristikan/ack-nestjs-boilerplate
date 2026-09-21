import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { IPasswordHistoryList } from '@modules/password-history/interfaces/password-history.interface';
import {
    EnumPasswordHistoryType,
    Prisma,
} from '@generated/prisma-client/client';
import type { PasswordHistory } from '@generated/prisma-client/client';

export interface IPasswordHistoryRepository {
    findWithPaginationOffsetByAdmin(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.PasswordHistoryWhereInput>
    ): Promise<IResponsePaginationReturn<IPasswordHistoryList>>;
    findWithPaginationCursor(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.PasswordHistoryWhereInput>
    ): Promise<IResponsePaginationReturn<IPasswordHistoryList>>;
    findActiveUser(userId: string): Promise<PasswordHistory[]>;
    createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        password: string,
        type: EnumPasswordHistoryType,
        expiredAt: Date,
        createdAt: Date,
        createdBy: string
    ): Promise<PasswordHistory>;
}
