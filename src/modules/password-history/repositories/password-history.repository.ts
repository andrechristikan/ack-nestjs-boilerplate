import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { IPasswordHistory } from '@modules/password-history/interfaces/password-history.interface';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import { Injectable } from '@nestjs/common';
import { PasswordHistory, Prisma } from '@generated/prisma-client';

@Injectable()
export class PasswordHistoryRepository {
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
    ): Promise<IResponsePagingReturn<IPasswordHistory>> {
        return this.paginationService.offset<
            IPasswordHistory,
            Prisma.PasswordHistoryWhereInput
        >(this.databaseService.client.passwordHistory, {
            ...others,
            where: {
                ...where,
                userId,
            },
            include: {
                user: {
                    select: UserRefSelect,
                },
            },
        });
    }

    async findWithPaginationCursor(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.PasswordHistoryWhereInput>
    ): Promise<IResponsePagingReturn<IPasswordHistory>> {
        return this.paginationService.cursor<
            IPasswordHistory,
            Prisma.PasswordHistoryWhereInput
        >(this.databaseService.client.passwordHistory, {
            ...others,
            where: {
                ...where,
                userId,
            },
            include: {
                user: {
                    select: UserRefSelect,
                },
            },
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
}
