import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticDeviceProliferationListRequestDto } from '@modules/analytic/dtos/request/analytic.device-proliferation-list.request.dto';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import type { IAnalyticDeviceProliferation } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { AnalyticDeviceProliferationAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticDeviceProliferationListUseCase implements IAppUseCase<
    [AnalyticDeviceProliferationListRequestDto],
    IResponsePaginationReturn<IAnalyticDeviceProliferation>
> {
    constructor(
        private readonly analyticAnomalyService: AnalyticAnomalyService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticDeviceProliferationListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticDeviceProliferation>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.DeviceOwnershipWhereInput>(
                query,
                {
                    availableOrderBy:
                        AnalyticDeviceProliferationAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticAnomalyService.deviceProliferationList(params);
    }
}
