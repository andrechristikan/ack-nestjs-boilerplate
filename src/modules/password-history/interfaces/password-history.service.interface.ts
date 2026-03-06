import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { PasswordHistoryResponseDto } from '@modules/password-history/dtos/response/password-history.response.dto';

export interface IPasswordHistoryService {
    getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.PasswordHistorySelect,
            Prisma.PasswordHistoryWhereInput
        >
    ): Promise<IResponsePagingReturn<PasswordHistoryResponseDto>>;
    getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<
            Prisma.PasswordHistorySelect,
            Prisma.PasswordHistoryWhereInput
        >
    ): Promise<IResponsePagingReturn<PasswordHistoryResponseDto>>;
}
