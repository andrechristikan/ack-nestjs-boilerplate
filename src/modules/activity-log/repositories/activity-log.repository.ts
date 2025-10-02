import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationCursorReturn,
    IPaginationEqual,
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
        { where, ...params }: IPaginationQueryOffsetParams,
        user?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<IActivityLog>> {
        return this.paginationService.offSet<IActivityLog>(
            this.databaseService.activityLog,
            {
                ...params,
                where: {
                    ...where,
                    ...user,
                },
                includes: {
                    user: true,
                },
            }
        );
    }

    async findWithPaginationCursor(
        { where, ...params }: IPaginationQueryCursorParams,
        user?: Record<string, IPaginationEqual>
    ): Promise<IPaginationCursorReturn<IActivityLog>> {
        return this.paginationService.cursor<IActivityLog>(
            this.databaseService.user,
            {
                ...params,
                where: {
                    ...where,
                    ...user,
                },
                includes: {
                    user: true,
                },
            }
        );
    }
}
