import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticDeviceService } from '@modules/analytic/services/analytic.device.service';
import type { IAnalyticMetricCount } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticDeviceInactivityUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticMetricCount>
> {
    constructor(
        private readonly analyticDeviceService: AnalyticDeviceService
    ) {}

    async execute(): Promise<IResponseReturn<IAnalyticMetricCount>> {
        const data = await this.analyticDeviceService.getDeviceInactivity();

        return { data };
    }
}
