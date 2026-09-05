import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { IActivityLogHttpService } from '@modules/activity-log/interfaces/activity-log.http.service.interface';
import { IActivityLog } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ActivityLogHttpService implements IActivityLogHttpService {
    constructor(private readonly activityLogService: ActivityLogService) {}

    async getListOffsetByUser(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IActivityLog>> {
        const { data, ...others } =
            await this.activityLogService.getListOffsetByUser(
                userId,
                pagination
            );

        return {
            data,
            ...others,
        };
    }

    async getListCursorByUser(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IActivityLog>> {
        const { data, ...others } =
            await this.activityLogService.getListCursorByUser(
                userId,
                pagination
            );

        return {
            data,
            ...others,
        };
    }

    async getListOffsetByWorkspace(
        workspaceId: string,
        userId: string | null,
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IActivityLog>> {
        const { data, ...others } =
            await this.activityLogService.getListOffsetByWorkspace(
                workspaceId,
                userId,
                pagination
            );

        return {
            data,
            ...others,
        };
    }

    async getListCursorByWorkspace(
        workspaceId: string,
        userId: string | null,
        pagination: IPaginationQueryCursorParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IActivityLog>> {
        const { data, ...others } =
            await this.activityLogService.getListCursorByWorkspace(
                workspaceId,
                userId,
                pagination
            );

        return {
            data,
            ...others,
        };
    }
}
