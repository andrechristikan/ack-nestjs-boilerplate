import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticFraudRiskScoresListRequestDto } from '@modules/analytic/dtos/request/analytic.fraud-risk-scores-list.request.dto';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import type { IAnalyticFraudRiskScore } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { AnalyticFraudRiskScoreAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticRiskScoresUseCase implements IAppUseCase<
    [AnalyticFraudRiskScoresListRequestDto],
    IResponsePaginationReturn<IAnalyticFraudRiskScore>
> {
    constructor(
        private readonly analyticFraudService: AnalyticFraudService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticFraudRiskScoresListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticFraudRiskScore>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.UserWhereInput>(query, {
                availableOrderBy: AnalyticFraudRiskScoreAvailableOrderBy,
            });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticFraudService.riskScores(
            query.minScore ?? null,
            params
        );
    }
}
