import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticSnapshotListRequestDto } from '@modules/analytic/dtos/request/analytic.snapshot-list.request.dto';
import { AnalyticWorkspaceService } from '@modules/analytic/services/analytic.workspace.service';
import type { IAnalyticWorkspaceCount } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticSnapshotOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { EnumAnalyticSnapshotOrderBy } from '@modules/analytic/enums/analytic.enum';

@Injectable()
export class AnalyticWorkspacesMembershipListUseCase implements IAppUseCase<
    [AnalyticSnapshotListRequestDto],
    IResponsePaginationReturn<IAnalyticWorkspaceCount>
> {
    constructor(
        private readonly analyticWorkspaceService: AnalyticWorkspaceService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticSnapshotListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const { params, storePatch } = this.paginationQueryUtil.offset(query, {
            orderBy: AnalyticSnapshotOrderBy,
            defaultOrderBy: EnumAnalyticSnapshotOrderBy.highestValue,
        });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticWorkspaceService.workspacesMembership(params);
    }
}
