import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticLoginSpikeIpListRequestDto } from '@modules/analytic/dtos/request/analytic.login-spike-ip-list.request.dto';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import type { IAnalyticLoginSpikeIp } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { AnalyticLoginSpikeIpAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticLoginSpikeIpListUseCase implements IAppUseCase<
    [AnalyticLoginSpikeIpListRequestDto],
    IResponsePaginationReturn<IAnalyticLoginSpikeIp>
> {
    constructor(
        private readonly analyticAnomalyService: AnalyticAnomalyService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticLoginSpikeIpListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticLoginSpikeIp>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ActivityLogWhereInput>(
                query,
                { availableOrderBy: AnalyticLoginSpikeIpAvailableOrderBy }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticAnomalyService.loginSpikeIpList(
            query.windowMs ?? null,
            params
        );
    }
}
