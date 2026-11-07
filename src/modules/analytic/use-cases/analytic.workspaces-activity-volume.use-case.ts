import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticWorkspacesActivityVolumeListRequestDto } from '@modules/analytic/dtos/request/analytic.workspaces-activity-volume-list.request.dto';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import type { IAnalyticWorkspaceCount } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticWorkspacesActivityVolumeUseCase implements IAppUseCase<
    [AnalyticWorkspacesActivityVolumeListRequestDto],
    IResponsePaginationReturn<IAnalyticWorkspaceCount>
> {
    constructor(
        private readonly analyticDashboardService: AnalyticDashboardService,
        private readonly analyticDateService: AnalyticDateService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticWorkspacesActivityVolumeListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ActivityLogWhereInput>(
                query,
                { availableOrderBy: [] }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);
        const range = this.analyticDateService.requireRange(
            query.startDate,
            query.endDate
        );

        return this.analyticDashboardService.workspacesActivityVolume(
            range.startDate,
            range.endDate,
            params
        );
    }
}
