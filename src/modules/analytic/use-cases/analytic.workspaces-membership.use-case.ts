import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticWorkspacesMembershipListRequestDto } from '@modules/analytic/dtos/request/analytic.workspaces-membership-list.request.dto';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import type { IAnalyticWorkspaceCount } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticWorkspacesMembershipUseCase implements IAppUseCase<
    [AnalyticWorkspacesMembershipListRequestDto],
    IResponsePaginationReturn<IAnalyticWorkspaceCount>
> {
    constructor(
        private readonly analyticDashboardService: AnalyticDashboardService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticWorkspacesMembershipListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.WorkspaceMemberWhereInput>(
                query,
                { availableOrderBy: [] }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticDashboardService.workspacesMembership(params);
    }
}
