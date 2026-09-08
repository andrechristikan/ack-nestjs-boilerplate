import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { PasswordHistory, Prisma } from '@generated/prisma-client';
import { IPasswordHistory } from '@modules/password-history/interfaces/password-history.interface';
import { IPasswordHistoryService } from '@modules/password-history/interfaces/password-history.service.interface';
import { PasswordHistoryRepository } from '@modules/password-history/repositories/password-history.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PasswordHistoryService implements IPasswordHistoryService {
    constructor(
        private readonly passwordHistoryRepository: PasswordHistoryRepository
    ) {}

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.PasswordHistoryWhereInput>
    ): Promise<IResponsePagingReturn<IPasswordHistory>> {
        return this.passwordHistoryRepository.findWithPaginationOffsetByAdmin(
            userId,
            pagination
        );
    }

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.PasswordHistoryWhereInput>
    ): Promise<IResponsePagingReturn<IPasswordHistory>> {
        return this.passwordHistoryRepository.findWithPaginationCursor(
            userId,
            pagination
        );
    }

    async getActiveByUser(userId: string): Promise<PasswordHistory[]> {
        return this.passwordHistoryRepository.findActiveUser(userId);
    }
}
