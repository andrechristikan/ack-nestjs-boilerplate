import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticSnapshotListRequestDto } from '@modules/analytic/dtos/request/analytic.snapshot-list.request.dto';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import type { IAnalyticSharedFingerprint } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { AnalyticSnapshotOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { EnumAnalyticSnapshotOrderBy } from '@modules/analytic/enums/analytic.enum';

@Injectable()
export class AnalyticSharedFingerprintListUseCase implements IAppUseCase<
    [AnalyticSnapshotListRequestDto],
    IResponsePaginationReturn<IAnalyticSharedFingerprint>
> {
    constructor(
        private readonly analyticFraudService: AnalyticFraudService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticSnapshotListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticSharedFingerprint>> {
        const { params, storePatch } = this.paginationQueryUtil.offset(query, {
            orderBy: AnalyticSnapshotOrderBy,
            defaultOrderBy: EnumAnalyticSnapshotOrderBy.highestValue,
        });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticFraudService.sharedFingerprintList(params);
    }
}
