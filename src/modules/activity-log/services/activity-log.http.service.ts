import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { IActivityLog } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ActivityLogHttpService {
    constructor(private readonly activityLogDomain: ActivityLogDomain) {}

    async getListOffsetByUser(
        userId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IActivityLog>> {
        const { data, ...others } =
            await this.activityLogDomain.getListOffsetByUser(
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
            await this.activityLogDomain.getListCursorByUser(
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
            await this.activityLogDomain.getListOffsetByWorkspace(
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
            await this.activityLogDomain.getListCursorByWorkspace(
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
