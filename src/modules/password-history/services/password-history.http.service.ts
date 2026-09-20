import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { IPasswordHistoryList } from '@modules/password-history/interfaces/password-history.interface';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PasswordHistoryHttpService {
    constructor(
        private readonly passwordHistoryDomain: PasswordHistoryDomain
    ) {}

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.PasswordHistoryWhereInput>
    ): Promise<IResponsePagingReturn<IPasswordHistoryList>> {
        const { data, ...others } =
            await this.passwordHistoryDomain.getListOffsetByAdmin(
                userId,
                pagination
            );

        return {
            data,
            ...others,
        };
    }

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.PasswordHistoryWhereInput>
    ): Promise<IResponsePagingReturn<IPasswordHistoryList>> {
        const { data, ...others } =
            await this.passwordHistoryDomain.getListCursor(userId, pagination);

        return {
            data,
            ...others,
        };
    }
}
