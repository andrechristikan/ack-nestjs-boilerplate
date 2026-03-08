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
        private readonly paginationService: PaginationService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async findWithPaginationOffset(
        { where, select, ...params }: IPaginationQueryOffsetParams<
            Prisma.ActivityLogSelect,
            Prisma.ActivityLogWhereInput
        >
    ): Promise<IResponsePagingReturn<IActivityLog>> {
        return this.paginationService.offset<
            IActivityLog,
            Prisma.ActivityLogSelect,
            Prisma.ActivityLogWhereInput
        >(this.databaseService.activityLog, {
            ...params,
            ...(select
                    ? { select: { ...(select as Record<string, unknown>), user: true } }
                    : { include: { user: true } }),
            where,
        });
    }

    async findWithPaginationCursor(
        { where, select, ...params
        }: IPaginationQueryCursorParams<
            Prisma.ActivityLogSelect,
            Prisma.ActivityLogWhereInput
        >
    ): Promise<IPaginationCursorReturn<IActivityLog>> {
        return this.paginationService.cursor<
            IActivityLog,
            Prisma.ActivityLogSelect,
            Prisma.ActivityLogWhereInput
        >(this.databaseService.activityLog, {
            ...params,
            ...(select
                    ? { select: { ...(select as Record<string, unknown>), user: true } }
                    : { include: { user: true } }),
            where,
        });
    }

    async create(
        userId: string,
        action: EnumActivityLogAction,
        { ipAddress, userAgent, geoLocation }: IRequestLog,
        metadata?: IActivityLogMetadata
    ): Promise<ActivityLog> {
        return this.databaseService.activityLog.create({
            data: {
                userId,
                action,
                ipAddress,
                userAgent: this.databaseUtil.toPlainObject(userAgent),
                geoLocation: this.databaseUtil.toPlainObject(geoLocation),
                metadata:
                    metadata && Object.keys(metadata).length > 0
                        ? (metadata as Prisma.InputJsonValue)
                        : null,
                createdBy: userId,
            },
        });
    }
}
