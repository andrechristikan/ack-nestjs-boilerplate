import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticDeviceService } from '@modules/analytic/services/analytic.device.service';
import type { IAnalyticSnapshotBucketsResult } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticDevicesPerUserUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticSnapshotBucketsResult>
> {
    constructor(
        private readonly analyticDeviceService: AnalyticDeviceService
    ) {}

    async execute(): Promise<IResponseReturn<IAnalyticSnapshotBucketsResult>> {
        const data = await this.analyticDeviceService.devicesPerUser();

        return { data };
    }
}
