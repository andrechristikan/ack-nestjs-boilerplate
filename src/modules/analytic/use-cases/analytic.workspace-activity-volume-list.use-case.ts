import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticWorkspaceActivityVolumeListRequestDto } from '@modules/analytic/dtos/request/analytic.workspace-activity-volume-list.request.dto';
import { AnalyticWorkspaceService } from '@modules/analytic/services/analytic.workspace.service';
import type { IAnalyticWorkspaceCount } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticCountOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { EnumAnalyticCountOrderBy } from '@modules/analytic/enums/analytic.enum';

@Injectable()
export class AnalyticWorkspaceActivityVolumeListUseCase implements IAppUseCase<
    [AnalyticWorkspaceActivityVolumeListRequestDto],
    IResponsePaginationReturn<IAnalyticWorkspaceCount>
> {
    constructor(
        private readonly analyticWorkspaceService: AnalyticWorkspaceService,
        private readonly analyticDateService: AnalyticDateService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticWorkspaceActivityVolumeListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticWorkspaceCount>> {
        const { params, storePatch } = this.paginationQueryUtil.offset(query, {
            orderBy: AnalyticCountOrderBy,
            defaultOrderBy: EnumAnalyticCountOrderBy.mostCount,
        });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);
        const range = this.analyticDateService.requireRange(
            query.startDate,
            query.endDate
        );

        return this.analyticWorkspaceService.getWorkspaceActivityVolumeList(
            range.startDate,
            range.endDate,
            params
        );
    }
}
