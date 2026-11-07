import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticNearLockoutListRequestDto } from '@modules/analytic/dtos/request/analytic.near-lockout-list.request.dto';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import type { IAnalyticNearLockout } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { AnalyticNearLockoutAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticFailedLoginSpikeListUseCase implements IAppUseCase<
    [AnalyticNearLockoutListRequestDto],
    IResponsePaginationReturn<IAnalyticNearLockout>
> {
    constructor(
        private readonly analyticAnomalyService: AnalyticAnomalyService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticNearLockoutListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticNearLockout>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.UserWhereInput>(query, {
                availableOrderBy: AnalyticNearLockoutAvailableOrderBy,
            });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticAnomalyService.failedLoginSpikeList(params);
    }
}
