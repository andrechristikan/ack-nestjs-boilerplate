import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticPasswordResetEnumerationListRequestDto } from '@modules/analytic/dtos/request/analytic.password-reset-enumeration-list.request.dto';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import type { IAnalyticPasswordResetEnumeration } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { AnalyticKeyCountAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticPasswordResetEnumerationListUseCase implements IAppUseCase<
    [AnalyticPasswordResetEnumerationListRequestDto],
    IResponsePaginationReturn<IAnalyticPasswordResetEnumeration>
> {
    constructor(
        private readonly analyticFraudService: AnalyticFraudService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticPasswordResetEnumerationListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticPasswordResetEnumeration>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ForgotPasswordWhereInput>(
                query,
                { availableOrderBy: AnalyticKeyCountAvailableOrderBy }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticFraudService.passwordResetEnumerationList(
            query.windowMs ?? null,
            params
        );
    }
}
