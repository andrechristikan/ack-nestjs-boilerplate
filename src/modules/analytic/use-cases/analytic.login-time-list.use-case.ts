import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticLoginTimeAnomalyListRequestDto } from '@modules/analytic/dtos/request/analytic.login-time-anomaly-list.request.dto';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import type { IAnalyticLoginTimeAnomaly } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { Injectable } from '@nestjs/common';
import { AnalyticLoginTimeAnomalyAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticLoginTimeListUseCase implements IAppUseCase<
    [AnalyticLoginTimeAnomalyListRequestDto],
    IResponsePaginationReturn<IAnalyticLoginTimeAnomaly>
> {
    constructor(
        private readonly analyticAnomalyService: AnalyticAnomalyService,
        private readonly analyticDateService: AnalyticDateService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticLoginTimeAnomalyListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticLoginTimeAnomaly>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ActivityLogWhereInput>(
                query,
                { availableOrderBy: AnalyticLoginTimeAnomalyAvailableOrderBy }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);
        const range = this.analyticDateService.optionalRange(
            query.startDate ?? null,
            query.endDate ?? null
        );
        return this.analyticAnomalyService.loginTimeList(
            range.startDate,
            range.endDate,
            params
        );
    }
}
