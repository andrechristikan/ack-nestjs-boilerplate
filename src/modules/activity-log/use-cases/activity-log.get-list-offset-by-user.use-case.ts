import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { ActivityLogAdminListRequestDto } from '@modules/activity-log/dtos/request/activity-log.admin-list.request.dto';
import type { IActivityLog } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { Injectable } from '@nestjs/common';
import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class ActivityLogGetListOffsetByUserUseCase implements IAppUseCase<
    [string, ActivityLogAdminListRequestDto],
    IResponsePaginationReturn<IActivityLog>
> {
    constructor(
        private readonly activityLogService: ActivityLogService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        userId: string,
        query: ActivityLogAdminListRequestDto
    ): Promise<IResponsePaginationReturn<IActivityLog>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ActivityLogWhereInput>(
                query,
                { availableOrderBy: ActivityLogDefaultAvailableOrderBy }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } =
            await this.activityLogService.getListOffsetByUser(userId, params);

        return {
            data,
            ...others,
        };
    }
}
