import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticProjectsMembershipListRequestDto } from '@modules/analytic/dtos/request/analytic.projects-membership-list.request.dto';
import { AnalyticDashboardService } from '@modules/analytic/services/analytic.dashboard.service';
import type { IAnalyticProjectCount } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticProjectsMembershipUseCase implements IAppUseCase<
    [AnalyticProjectsMembershipListRequestDto],
    IResponsePaginationReturn<IAnalyticProjectCount>
> {
    constructor(
        private readonly analyticDashboardService: AnalyticDashboardService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticProjectsMembershipListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticProjectCount>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ProjectMemberWhereInput>(
                query,
                { availableOrderBy: [] }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticDashboardService.projectsMembership(params);
    }
}
