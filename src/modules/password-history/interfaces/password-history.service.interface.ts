import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { PasswordHistory, Prisma } from '@generated/prisma-client';
import { IPasswordHistory } from '@modules/password-history/interfaces/password-history.interface';

export interface IPasswordHistoryService {
    getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.PasswordHistoryWhereInput>
    ): Promise<IResponsePagingReturn<IPasswordHistory>>;
    getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.PasswordHistoryWhereInput>
    ): Promise<IResponsePagingReturn<IPasswordHistory>>;
    getActiveByUser(userId: string): Promise<PasswordHistory[]>;
}
