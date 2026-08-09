import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { IActivityLogService } from '@modules/activity-log/interfaces/activity-log.service.interface';
import { ActivityLogRepository } from '@modules/activity-log/repositories/activity-log.repository';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ActivityLogService implements IActivityLogService {
    constructor(
        private readonly activityRepository: ActivityLogRepository,
        private readonly activityUtil: ActivityLogUtil
    ) {}

    async getListOffsetByUser(
        userId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.ActivityLogSelect,
            Prisma.ActivityLogWhereInput
        >
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {
        const { data, ...others } =
            await this.activityRepository.findUserScopedWithPaginationOffset(
                userId,
                pagination
            );

        const activityLogs: ActivityLogResponseDto[] =
            this.activityUtil.mapList(data);
        return {
            data: activityLogs,
            ...others,
        };
    }

    async getListCursorByUser(
        userId: string,
        pagination: IPaginationQueryCursorParams<
            Prisma.ActivityLogSelect,
            Prisma.ActivityLogWhereInput
        >
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {
        const { data, ...others } =
            await this.activityRepository.findUserScopedWithPaginationCursor(
                userId,
                pagination
            );

        const activityLogs: ActivityLogResponseDto[] =
            this.activityUtil.mapList(data);
        return {
            data: activityLogs,
            ...others,
        };
    }

    async getListOffsetByWorkspace(
        workspaceId: string,
        userId: string | null,
        pagination: IPaginationQueryOffsetParams<
            Prisma.ActivityLogSelect,
            Prisma.ActivityLogWhereInput
        >
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {
        const { data, ...others } =
            await this.activityRepository.findByWorkspaceWithPaginationOffset(
                workspaceId,
                userId,
                pagination
            );

        const activityLogs: ActivityLogResponseDto[] =
            this.activityUtil.mapList(data);
        return {
            data: activityLogs,
            ...others,
        };
    }

    async getListCursorByWorkspace(
        workspaceId: string,
        userId: string | null,
        pagination: IPaginationQueryCursorParams<
            Prisma.ActivityLogSelect,
            Prisma.ActivityLogWhereInput
        >
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {
        const { data, ...others } =
            await this.activityRepository.findByWorkspaceWithPaginationCursor(
                workspaceId,
                userId,
                pagination
            );

        const activityLogs: ActivityLogResponseDto[] =
            this.activityUtil.mapList(data);
        return {
            data: activityLogs,
            ...others,
        };
    }
}
