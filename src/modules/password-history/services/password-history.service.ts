import { Injectable } from '@nestjs/common';
import { IPasswordHistoryService } from '@modules/password-history/interfaces/password-history.service.interface';
import { PasswordHistoryRepository } from '@modules/password-history/repositories/password-history.repository';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { PasswordHistoryResponseDto } from '@modules/password-history/dtos/response/password-history.response.dto';
import { PasswordHistoryUtil } from '@modules/password-history/utils/password-history.util';
@Injectable()
export class PasswordHistoryService implements IPasswordHistoryService {
    constructor(
        private readonly passwordHistoryRepository: PasswordHistoryRepository,
        private readonly passwordHistoryUtil: PasswordHistoryUtil
    ) {}

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<PasswordHistoryResponseDto>> {
        const { data, ...others } =
            await this.passwordHistoryRepository.findWithPaginationOffsetByAdmin(
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
        pagination: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<PasswordHistoryResponseDto>> {
        const { data, ...others } =
            await this.passwordHistoryRepository.findWithPaginationCursor(
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
}
