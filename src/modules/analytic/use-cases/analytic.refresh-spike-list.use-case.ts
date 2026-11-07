import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticRefreshSpikeListRequestDto } from '@modules/analytic/dtos/request/analytic.refresh-spike-list.request.dto';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import type { IAnalyticRefreshSpike } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { AnalyticUserCountAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticRefreshSpikeListUseCase implements IAppUseCase<
    [AnalyticRefreshSpikeListRequestDto],
    IResponsePaginationReturn<IAnalyticRefreshSpike>
> {
    constructor(
        private readonly analyticFraudService: AnalyticFraudService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticRefreshSpikeListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticRefreshSpike>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ActivityLogWhereInput>(
                query,
                { availableOrderBy: AnalyticUserCountAvailableOrderBy }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticFraudService.refreshSpikeList(
            query.windowMs ?? null,
            params
        );
    }
}
