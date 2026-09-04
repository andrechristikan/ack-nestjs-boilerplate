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
import { UserRefSelect } from '@modules/user/constants/user.constant';
import { Injectable } from '@nestjs/common';
import {
    ActivityLog,
    EnumActivityLogAction,
    Prisma,
} from '@generated/prisma-client';

@Injectable()
export class ActivityLogRepository {
    private readonly userScopedFilter: NonNullable<
        Prisma.ActivityLogWhereInput['OR']
    > = [{ workspaceId: null }, { workspaceId: { isSet: false } }];

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
            AND: [
                ...(where ? [where] : []),
                { userId },
                { OR: this.userScopedFilter },
            ],
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

    async create(
        userId: string,
        action: EnumActivityLogAction,
        description: string,
        { ipAddress, userAgent, geoLocation }: IRequestLog,
        metadata?: IActivityLogMetadata
    ): Promise<ActivityLog> {
        return this.databaseService.client.activityLog.create({
            data: {
                userId,
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
            },
        });
    }
}
