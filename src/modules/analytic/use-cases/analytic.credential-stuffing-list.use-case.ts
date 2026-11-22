import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticCredentialStuffingListRequestDto } from '@modules/analytic/dtos/request/analytic.credential-stuffing-list.request.dto';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import type { IAnalyticCredentialStuffing } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { AnalyticCredentialStuffingOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { EnumAnalyticCredentialStuffingOrderBy } from '@modules/analytic/enums/analytic.enum';

@Injectable()
export class AnalyticCredentialStuffingListUseCase implements IAppUseCase<
    [AnalyticCredentialStuffingListRequestDto],
    IResponsePaginationReturn<IAnalyticCredentialStuffing>
> {
    constructor(
        private readonly analyticFraudService: AnalyticFraudService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticCredentialStuffingListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticCredentialStuffing>> {
        const { params, storePatch } = this.paginationQueryUtil.offset(query, {
            orderBy: AnalyticCredentialStuffingOrderBy,
            defaultOrderBy: EnumAnalyticCredentialStuffingOrderBy.mostUsers,
        });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticFraudService.getCredentialStuffingList(params);
    }
}
