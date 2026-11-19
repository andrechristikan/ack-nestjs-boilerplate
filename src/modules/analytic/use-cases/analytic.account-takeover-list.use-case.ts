import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticAccountTakeoverListRequestDto } from '@modules/analytic/dtos/request/analytic.account-takeover-list.request.dto';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import type { IAnalyticAccountTakeover } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { AnalyticAccountTakeoverOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { EnumAnalyticAccountTakeoverOrderBy } from '@modules/analytic/enums/analytic.enum';

@Injectable()
export class AnalyticAccountTakeoverListUseCase implements IAppUseCase<
    [AnalyticAccountTakeoverListRequestDto],
    IResponsePaginationReturn<IAnalyticAccountTakeover>
> {
    constructor(
        private readonly analyticFraudService: AnalyticFraudService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticAccountTakeoverListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticAccountTakeover>> {
        const { params, storePatch } = this.paginationQueryUtil.offset(query, {
            orderBy: AnalyticAccountTakeoverOrderBy,
            defaultOrderBy: EnumAnalyticAccountTakeoverOrderBy.latest,
        });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticFraudService.accountTakeoverList(params);
    }
}
