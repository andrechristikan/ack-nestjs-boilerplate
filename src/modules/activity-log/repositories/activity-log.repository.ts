import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationCursorReturn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { IActivityLog } from '@modules/activity-log/interfaces/activity-log.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ActivityLogRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPaginationOffset(
        userId: string,
        { where, ...params }: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<IActivityLog>> {
        return this.paginationService.offset<IActivityLog>(
            this.databaseService.activityLog,
            {
                ...params,
                where: {
                    ...where,
                    userId,
                },
                includes: {
                    user: true,
                },
            }
        );
    }

    async findWithPaginationCursor(
        userId: string,
        { where, ...params }: IPaginationQueryCursorParams
    ): Promise<IPaginationCursorReturn<IActivityLog>> {
        return this.paginationService.cursor<IActivityLog>(
            this.databaseService.user,
            {
                ...params,
                where: {
                    ...where,
                    userId,
                },
                includes: {
                    user: true,
                },
            }
        );
    }
}
