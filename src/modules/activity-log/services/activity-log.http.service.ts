import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';
import type { ActivityLogAdminListRequestDto } from '@modules/activity-log/dtos/request/activity-log.admin-list.request.dto';
import type { ActivityLogSharedListRequestDto } from '@modules/activity-log/dtos/request/activity-log.shared-list.request.dto';
import type { IActivityLog } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ActivityLogHttpService {
    constructor(
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListOffsetByUser(
        userId: string,
        query: ActivityLogAdminListRequestDto
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ActivityLogWhereInput>(
                query,
                {
                    availableOrderBy: ActivityLogDefaultAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.activityLogDomain.getListOffsetByUser(userId, params);

        return {
            data,
            ...others,
        };
    }

    async getListCursorByUser(
        userId: string,
        query: ActivityLogSharedListRequestDto
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.ActivityLogWhereInput>(
                query,
                {
                    availableOrderBy: ActivityLogDefaultAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.activityLogDomain.getListCursorByUser(userId, params);

        return {
            data,
            ...others,
        };
    }

    async getListOffsetByWorkspace(
        workspaceId: string,
        userId: string | null,
        query: ActivityLogAdminListRequestDto
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ActivityLogWhereInput>(
                query,
                {
                    availableOrderBy: ActivityLogDefaultAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.activityLogDomain.getListOffsetByWorkspace(
                workspaceId,
                userId,
                params
            );

        return {
            data,
            ...others,
        };
    }

    async getListCursorByWorkspace(
        workspaceId: string,
        userId: string | null,
        query: ActivityLogSharedListRequestDto
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.ActivityLogWhereInput>(
                query,
                {
                    availableOrderBy: ActivityLogDefaultAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.activityLogDomain.getListCursorByWorkspace(
                workspaceId,
                userId,
                params
            );

        return {
            data,
            ...others,
        };
    }
}
