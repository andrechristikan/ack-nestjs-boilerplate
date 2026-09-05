import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { IPasswordHistoryHttpService } from '@modules/password-history/interfaces/password-history.http.service.interface';
import { IPasswordHistory } from '@modules/password-history/interfaces/password-history.interface';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PasswordHistoryHttpService implements IPasswordHistoryHttpService {
    constructor(
        private readonly passwordHistoryService: PasswordHistoryService
    ) {}

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.PasswordHistoryWhereInput>
    ): Promise<IResponsePagingReturn<IPasswordHistory>> {
        const { data, ...others } =
            await this.passwordHistoryService.getListOffsetByAdmin(
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
    ): Promise<IResponsePagingReturn<IPasswordHistory>> {
        const { data, ...others } =
            await this.passwordHistoryService.getListCursor(userId, pagination);

        return {
            data,
            ...others,
        };
    }
}
