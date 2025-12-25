import { DatabaseService } from '@common/database/services/database.service';
import { HelperService } from '@common/helper/services/helper.service';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { IPasswordHistory } from '@modules/password-history/interfaces/password-history.interface';
import { Injectable } from '@nestjs/common';
import { PasswordHistory, Prisma } from '@prisma/client';

@Injectable()
export class PasswordHistoryRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly helperService: HelperService
    ) {}

    async findWithPaginationOffsetByAdmin(
        userId: string,
        { where, ...others }: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<IPasswordHistory>> {
        return this.paginationService.offset<IPasswordHistory>(
            this.databaseService.passwordHistory,
            {
                ...others,
                where: {
                    ...where,
                    userId,
                },
                include: {
                    user: true,
                },
            }
        );
    }

    async findWithPaginationCursor(
        userId: string,
        { where, ...others }: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<IPasswordHistory>> {
        return this.paginationService.cursor<IPasswordHistory>(
            this.databaseService.passwordHistory,
            {
                ...others,
                where: {
                    ...where,
                    userId,
                },
                include: {
                    user: true,
                },
            }
        );
    }

    async findAllActiveUser(userId: string): Promise<PasswordHistory[]> {
        const today = this.helperService.dateCreate();
        return this.databaseService.passwordHistory.findMany({
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
