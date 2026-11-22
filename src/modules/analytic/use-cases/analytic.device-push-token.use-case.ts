import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticDeviceService } from '@modules/analytic/services/analytic.device.service';
import type { IAnalyticMetricRate } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticDevicePushTokenUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticMetricRate>
> {
    constructor(
        private readonly analyticDeviceService: AnalyticDeviceService
    ) {}

    async execute(): Promise<IResponseReturn<IAnalyticMetricRate>> {
        const data = await this.analyticDeviceService.getDevicePushToken();

        return { data };
    }
}
