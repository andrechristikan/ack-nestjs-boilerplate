import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type {
    IPaginationCursorReturn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import type {
    IActivityLog,
    IActivityLogCreate,
} from '@modules/activity-log/interfaces/activity-log.interface';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import type { IActivityLogRepository } from '@modules/activity-log/interfaces/activity-log.repository.interface';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';

@Injectable()
export class ActivityLogRepository implements IActivityLogRepository {
    private readonly userScopedFilter: Prisma.ActivityLogWhereInput = {
        workspaceId: null,
    };

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
            AND: [...(where ? [where] : []), { userId }, this.userScopedFilter],
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
        const scopedWhere = this.buildUserScopedWhere(userId, where);

        return this.paginationService.offset<
            IActivityLog,
            Prisma.ActivityLogWhereInput
        >(this.databaseService.client.activityLog, {
            ...params,
            where: scopedWhere,
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
        const scopedWhere = this.buildUserScopedWhere(userId, where);

        return this.paginationService.cursor<
            IActivityLog,
            Prisma.ActivityLogWhereInput
        >(this.databaseService.client.activityLog, {
            ...params,
            where: scopedWhere,
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
        const scopedWhere = this.buildWorkspaceScopedWhere(
            workspaceId,
            userId,
            where
        );

        return this.paginationService.offset<
            IActivityLog,
            Prisma.ActivityLogWhereInput
        >(this.databaseService.client.activityLog, {
            ...params,
            where: scopedWhere,
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
        const scopedWhere = this.buildWorkspaceScopedWhere(
            workspaceId,
            userId,
            where
        );

        return this.paginationService.cursor<
            IActivityLog,
            Prisma.ActivityLogWhereInput
        >(this.databaseService.client.activityLog, {
            ...params,
            where: scopedWhere,
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
                createdBy: _createdBy,
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
                metadata: this.databaseUtil.toPlainObject(
                    metadata && Object.keys(metadata).length > 0
                        ? metadata
                        : null
                ),
                createdBy: userId,
            })
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
