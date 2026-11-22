import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticImpossibleTravelListRequestDto } from '@modules/analytic/dtos/request/analytic.impossible-travel-list.request.dto';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import type { IAnalyticImpossibleTravel } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { AnalyticImpossibleTravelOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { EnumAnalyticImpossibleTravelOrderBy } from '@modules/analytic/enums/analytic.enum';

@Injectable()
export class AnalyticAnomalyImpossibleTravelListUseCase implements IAppUseCase<
    [AnalyticImpossibleTravelListRequestDto],
    IResponsePaginationReturn<IAnalyticImpossibleTravel>
> {
    constructor(
        private readonly analyticAnomalyService: AnalyticAnomalyService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticImpossibleTravelListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticImpossibleTravel>> {
        const { params, storePatch } = this.paginationQueryUtil.offset(query, {
            orderBy: AnalyticImpossibleTravelOrderBy,
            defaultOrderBy: EnumAnalyticImpossibleTravelOrderBy.highestValue,
        });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticAnomalyService.getAnomalyImpossibleTravelList(
            params
        );
    }
}
