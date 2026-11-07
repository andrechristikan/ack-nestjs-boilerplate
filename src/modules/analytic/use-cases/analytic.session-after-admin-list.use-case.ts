import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticSessionAfterAdminListRequestDto } from '@modules/analytic/dtos/request/analytic.session-after-admin-list.request.dto';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import type { IAnalyticSessionAfterAdmin } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { Injectable } from '@nestjs/common';
import { AnalyticSessionAfterAdminAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticSessionAfterAdminListUseCase implements IAppUseCase<
    [AnalyticSessionAfterAdminListRequestDto],
    IResponsePaginationReturn<IAnalyticSessionAfterAdmin>
> {
    constructor(
        private readonly analyticFraudService: AnalyticFraudService,
        private readonly analyticDateService: AnalyticDateService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticSessionAfterAdminListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticSessionAfterAdmin>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ActivityLogWhereInput>(
                query,
                { availableOrderBy: AnalyticSessionAfterAdminAvailableOrderBy }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);
        const range = this.analyticDateService.requireRange(
            query.startDate,
            query.endDate
        );
        return this.analyticFraudService.sessionAfterAdminList(
            range.startDate,
            range.endDate,
            params
        );
    }
}
