import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type {
    IPaginationCursorReturn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    IActivityLog,
    IActivityLogCreate,
    IActivityLogScope,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import type { IActivityLogRepository } from '@modules/activity-log/interfaces/activity-log.repository.interface';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';

@Injectable()
export class ActivityLogRepository implements IActivityLogRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async findWithPaginationOffset(
        scope: IActivityLogScope,
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>,
        additionalWhere?: Prisma.ActivityLogWhereInput
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        return this.paginationService.offset<
            IActivityLog,
            Prisma.ActivityLogWhereInput
        >(this.databaseService.client.activityLog, {
            ...params,
            where: {
                AND: [where ?? {}, scope, additionalWhere ?? {}],
            },
            include: {
                user: {
                    select: UserRefSelect,
                },
            },
        });
    }

    async findWithPaginationCursor(
        scope: IActivityLogScope,
        {
            where,
            ...params
        }: IPaginationQueryCursorParams<Prisma.ActivityLogWhereInput>,
        additionalWhere?: Prisma.ActivityLogWhereInput
    ): Promise<IPaginationCursorReturn<IActivityLog>> {
        return this.paginationService.cursor<
            IActivityLog,
            Prisma.ActivityLogWhereInput
        >(this.databaseService.client.activityLog, {
            ...params,
            where: {
                AND: [where ?? {}, scope, additionalWhere ?? {}],
            },
            include: {
                user: {
                    select: UserRefSelect,
                },
            },
        });
    }

    private mapCreateManyData(
        rows: IActivityLogCreate[]
    ): Prisma.ActivityLogCreateManyInput[] {
        return rows.map(
            ({
                userId,
                createdBy,
                workspaceId,
                action,
                description,
                requestLog: { ipAddress, userAgent, geoLocation },
                metadata,
            }) => {
                const plainUserAgent =
                    this.databaseUtil.toPlainObject(userAgent);
                const plainGeoLocation =
                    this.databaseUtil.toPlainObject(geoLocation);

                return {
                    userId,
                    workspaceId,
                    action,
                    ipAddress,
                    userAgent: plainUserAgent,
                    geoLocation: plainGeoLocation,
                    description,
                    metadata:
                        Object.keys(metadata).length > 0
                            ? (metadata as Prisma.InputJsonValue)
                            : Prisma.DbNull,
                    createdBy,
                };
            }
        );
    }

    async createMany(rows: IActivityLogCreate[]): Promise<Prisma.BatchPayload> {
        const createManyData = this.mapCreateManyData(rows);

        return this.databaseService.withTransaction(async tx =>
            tx.activityLog.createMany({
                data: createManyData,
            })
        );
    }
}
