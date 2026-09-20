import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumPasswordHistoryType,
    Prisma,
} from '@generated/prisma-client/client';
import type { PasswordHistory } from '@generated/prisma-client/client';
import type { IPasswordHistoryList } from '@modules/password-history/interfaces/password-history.interface';
import { PasswordHistoryRepository } from '@modules/password-history/repositories/password-history.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PasswordHistoryDomain {
    constructor(
        private readonly passwordHistoryRepository: PasswordHistoryRepository
    ) {}

    async getListOffsetByAdmin(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.PasswordHistoryWhereInput>
    ): Promise<IResponsePagingReturn<IPasswordHistoryList>> {
        return this.passwordHistoryRepository.findWithPaginationOffsetByAdmin(
            userId,
            pagination
        );
    }

    async getListCursor(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.PasswordHistoryWhereInput>
    ): Promise<IResponsePagingReturn<IPasswordHistoryList>> {
        return this.passwordHistoryRepository.findWithPaginationCursor(
            userId,
            pagination
        );
    }

    async getActiveByUser(userId: string): Promise<PasswordHistory[]> {
        return this.passwordHistoryRepository.findActiveUser(userId);
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        password: string,
        type: EnumPasswordHistoryType,
        expiredAt: Date,
        createdAt: Date,
        createdBy: string
    ): Promise<PasswordHistory> {
        return this.passwordHistoryRepository.createInTx(
            tx,
            userId,
            password,
            type,
            expiredAt,
            createdAt,
            createdBy
        );
    }
}
