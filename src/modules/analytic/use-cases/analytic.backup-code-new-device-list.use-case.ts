import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { AnalyticBackupCodeNewDeviceListRequestDto } from '@modules/analytic/dtos/request/analytic.backup-code-new-device-list.request.dto';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import type { IAnalyticBackupCodeNewDevice } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import { AnalyticBackupCodeNewDeviceAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticBackupCodeNewDeviceListUseCase implements IAppUseCase<
    [AnalyticBackupCodeNewDeviceListRequestDto],
    IResponsePaginationReturn<IAnalyticBackupCodeNewDevice>
> {
    constructor(
        private readonly analyticFraudService: AnalyticFraudService,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async execute(
        query: AnalyticBackupCodeNewDeviceListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticBackupCodeNewDevice>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ActivityLogWhereInput>(
                query,
                {
                    availableOrderBy:
                        AnalyticBackupCodeNewDeviceAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticFraudService.backupCodeNewDeviceList(
            query.windowMs ?? null,
            params
        );
    }
}
