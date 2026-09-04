import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { PasswordHistoryResponseDto } from '@modules/password-history/dtos/response/password-history.response.dto';
import { IPasswordHistoryHttpService } from '@modules/password-history/interfaces/password-history.http.service.interface';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { PasswordHistoryUtil } from '@modules/password-history/utils/password-history.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PasswordHistoryHttpService implements IPasswordHistoryHttpService {
    constructor(
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly passwordHistoryUtil: PasswordHistoryUtil
    ) {}

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.PasswordHistoryWhereInput>
    ): Promise<IResponsePagingReturn<PasswordHistoryResponseDto>> {
        const { data, ...others } =
            await this.passwordHistoryService.getListOffsetByAdmin(
                userId,
                pagination
            );
        const passwordHistories: PasswordHistoryResponseDto[] =
            this.passwordHistoryUtil.mapList(data);

        return {
            data: passwordHistories,
            ...others,
        };
    }

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.PasswordHistoryWhereInput>
    ): Promise<IResponsePagingReturn<PasswordHistoryResponseDto>> {
        const { data, ...others } =
            await this.passwordHistoryService.getListCursor(userId, pagination);
        const passwordHistories: PasswordHistoryResponseDto[] =
            this.passwordHistoryUtil.mapList(data);

        return {
            data: passwordHistories,
            ...others,
        };
    }
}
