import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { PasswordHistoryListSelect } from '@modules/password-history/constants/password-history.constant';
import type { IPasswordHistoryList } from '@modules/password-history/interfaces/password-history.interface';
import type { IPasswordHistoryRepository } from '@modules/password-history/interfaces/password-history.repository.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumPasswordHistoryType,
    Prisma,
} from '@generated/prisma-client/client';
import type { PasswordHistory } from '@generated/prisma-client/client';

@Injectable()
export class PasswordHistoryRepository implements IPasswordHistoryRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly helperDateService: HelperDateService
    ) {}

    async findWithPaginationOffsetByAdmin(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.PasswordHistoryWhereInput>
    ): Promise<IResponsePagingReturn<IPasswordHistoryList>> {
        return this.paginationService.offset<
            IPasswordHistoryList,
            Prisma.PasswordHistoryWhereInput
        >(this.databaseService.client.passwordHistory, {
            ...others,
            where: {
                ...where,
                userId,
            },
            select: PasswordHistoryListSelect,
        });
    }

    async findWithPaginationCursor(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.PasswordHistoryWhereInput>
    ): Promise<IResponsePagingReturn<IPasswordHistoryList>> {
        return this.paginationService.cursor<
            IPasswordHistoryList,
            Prisma.PasswordHistoryWhereInput
        >(this.databaseService.client.passwordHistory, {
            ...others,
            where: {
                ...where,
                userId,
            },
            select: PasswordHistoryListSelect,
        });
    }

    async findActiveUser(userId: string): Promise<PasswordHistory[]> {
        const today = this.helperDateService.create();
        return this.databaseService.client.passwordHistory.findMany({
            where: {
                userId,
                expiredAt: {
                    gte: today,
                },
            },
            orderBy: {
                createdAt: Prisma.SortOrder.desc,
            },
        });
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
        return tx.passwordHistory.create({
            data: {
                userId,
                password,
                type,
                expiredAt,
                createdAt,
                createdBy,
            },
        });
    }
}
