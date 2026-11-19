import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticMassRegistrationListRequestDto } from '@modules/analytic/dtos/request/analytic.mass-registration-list.request.dto';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import type { IAnalyticMassRegistration } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { AnalyticKeyCountOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { EnumAnalyticKeyCountOrderBy } from '@modules/analytic/enums/analytic.enum';

@Injectable()
export class AnalyticMassRegistrationListUseCase implements IAppUseCase<
    [AnalyticMassRegistrationListRequestDto],
    IResponsePaginationReturn<IAnalyticMassRegistration>
> {
    constructor(
        private readonly analyticFraudService: AnalyticFraudService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticMassRegistrationListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticMassRegistration>> {
        const { params, storePatch } = this.paginationQueryUtil.offset(query, {
            orderBy: AnalyticKeyCountOrderBy,
            defaultOrderBy: EnumAnalyticKeyCountOrderBy.mostCount,
        });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticFraudService.massRegistrationList(params);
    }
}
