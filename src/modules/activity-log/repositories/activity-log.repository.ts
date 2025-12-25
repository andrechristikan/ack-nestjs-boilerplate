import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    IPaginationCursorReturn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    IActivityLog,
    IActivityLogMetadata,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { Injectable } from '@nestjs/common';
import { ActivityLog, EnumActivityLogAction, Prisma } from '@prisma/client';

@Injectable()
export class ActivityLogRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
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
                include: {
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
            this.databaseService.activityLog,
            {
                ...params,
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

    async create(
        userId: string,
        action: EnumActivityLogAction,
        { ipAddress, userAgent }: IRequestLog,
        metadata?: IActivityLogMetadata
    ): Promise<ActivityLog> {
        return this.databaseService.activityLog.create({
            data: {
                userId,
                action,
                ipAddress,
                userAgent: this.databaseUtil.toPlainObject(userAgent),
                metadata:
                    metadata && Object.keys(metadata).length > 0
                        ? (metadata as Prisma.InputJsonValue)
                        : null,
                createdBy: userId,
            },
        });
    }
}
