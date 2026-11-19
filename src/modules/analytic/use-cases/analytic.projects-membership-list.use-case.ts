import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticProjectsMembershipListRequestDto } from '@modules/analytic/dtos/request/analytic.projects-membership-list.request.dto';
import { AnalyticProjectService } from '@modules/analytic/services/analytic.project.service';
import type { IAnalyticProjectCount } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticCountOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { EnumAnalyticCountOrderBy } from '@modules/analytic/enums/analytic.enum';

@Injectable()
export class AnalyticProjectsMembershipListUseCase implements IAppUseCase<
    [AnalyticProjectsMembershipListRequestDto],
    IResponsePaginationReturn<IAnalyticProjectCount>
> {
    constructor(
        private readonly analyticProjectService: AnalyticProjectService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticProjectsMembershipListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticProjectCount>> {
        const { params, storePatch } = this.paginationQueryUtil.offset(query, {
            orderBy: AnalyticCountOrderBy,
            defaultOrderBy: EnumAnalyticCountOrderBy.mostCount,
        });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticProjectService.projectsMembership(params);
    }
}
