import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { IActivityLogHttpService } from '@modules/activity-log/interfaces/activity-log.http.service.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ActivityLogHttpService implements IActivityLogHttpService {
    constructor(
        private readonly activityLogService: ActivityLogService,
        private readonly activityUtil: ActivityLogUtil
    ) {}

    async getListOffsetByUser(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {
        const { data, ...others } =
            await this.activityLogService.getListOffsetByUser(
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
        pagination: IPaginationQueryCursorParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {
        const { data, ...others } =
            await this.activityLogService.getListCursorByUser(
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
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {
        const { data, ...others } =
            await this.activityLogService.getListOffsetByWorkspace(
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
        pagination: IPaginationQueryCursorParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<ActivityLogResponseDto>> {
        const { data, ...others } =
            await this.activityLogService.getListCursorByWorkspace(
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
