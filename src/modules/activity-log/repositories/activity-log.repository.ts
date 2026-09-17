import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type {
    IPaginationCursorReturn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import type { IActivityLog } from '@modules/activity-log/interfaces/activity-log.interface';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import type {
    IActivityLogCreateManyRow,
    IActivityLogRepository,
} from '@modules/activity-log/interfaces/activity-log.repository.interface';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';

@Injectable()
export class ActivityLogRepository implements IActivityLogRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    private buildUserScopedWhere(
        userId: string,
        where?: Prisma.ActivityLogWhereInput
    ): Prisma.ActivityLogWhereInput {
        return {
            AND: [...(where ? [where] : []), { userId }],
        };
    }

    private buildWorkspaceScopedWhere(
        workspaceId: string,
        userId: string | null,
        where?: Prisma.ActivityLogWhereInput
    ): Prisma.ActivityLogWhereInput {
        return {
            AND: [
                ...(where ? [where] : []),
                { workspaceId },
                ...(userId !== null ? [{ userId }] : []),
            ],
        };
    }

    async findUserScopedWithPaginationOffset(
        userId: string,
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IActivityLog>> {
        return this.paginationService.offset<
            IActivityLog,
            Prisma.ActivityLogWhereInput
        >(this.databaseService.client.activityLog, {
            ...params,
            where: this.buildUserScopedWhere(userId, where),
            include: {
                user: {
                    select: UserRefSelect,
                },
            },
        });
    }

    async findUserScopedWithPaginationCursor(
        userId: string,
        {
            where,
            ...params
        }: IPaginationQueryCursorParams<Prisma.ActivityLogWhereInput>
    ): Promise<IPaginationCursorReturn<IActivityLog>> {
        return this.paginationService.cursor<
            IActivityLog,
            Prisma.ActivityLogWhereInput
        >(this.databaseService.client.activityLog, {
            ...params,
            where: this.buildUserScopedWhere(userId, where),
            include: {
                user: {
                    select: UserRefSelect,
                },
            },
        });
    }

    async findByWorkspaceWithPaginationOffset(
        workspaceId: string,
        userId: string | null,
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IActivityLog>> {
        return this.paginationService.offset<
            IActivityLog,
            Prisma.ActivityLogWhereInput
        >(this.databaseService.client.activityLog, {
            ...params,
            where: this.buildWorkspaceScopedWhere(workspaceId, userId, where),
            include: {
                user: {
                    select: UserRefSelect,
                },
            },
        });
    }

    async findByWorkspaceWithPaginationCursor(
        workspaceId: string,
        userId: string | null,
        {
            where,
            ...params
        }: IPaginationQueryCursorParams<Prisma.ActivityLogWhereInput>
    ): Promise<IPaginationCursorReturn<IActivityLog>> {
        return this.paginationService.cursor<
            IActivityLog,
            Prisma.ActivityLogWhereInput
        >(this.databaseService.client.activityLog, {
            ...params,
            where: this.buildWorkspaceScopedWhere(workspaceId, userId, where),
            include: {
                user: {
                    select: UserRefSelect,
                },
            },
        });
    }

    private mapCreateManyData(
        rows: IActivityLogCreateManyRow[]
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
            }) => ({
                userId,
                workspaceId,
                action,
                ipAddress,
                userAgent: this.databaseUtil.toPlainObject(userAgent),
                geoLocation: this.databaseUtil.toPlainObject(geoLocation),
                description,
                metadata:
                    Object.keys(metadata).length > 0
                        ? (metadata as Prisma.InputJsonValue)
                        : null,
                createdBy,
            })
        );
    }

    async createMany(
        rows: IActivityLogCreateManyRow[]
    ): Promise<Prisma.BatchPayload> {
        return this.databaseService.withTransaction(async tx =>
            tx.activityLog.createMany({
                data: this.mapCreateManyData(rows),
            })
        );
    }
}
