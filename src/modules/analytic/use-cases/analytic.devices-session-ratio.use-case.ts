import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticDeviceService } from '@modules/analytic/services/analytic.device.service';
import type { IAnalyticSessionDeviceRatio } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticDevicesSessionRatioUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticSessionDeviceRatio>
> {
    constructor(
        private readonly analyticDeviceService: AnalyticDeviceService
    ) {}

    async execute(): Promise<IResponseReturn<IAnalyticSessionDeviceRatio>> {
        const data = await this.analyticDeviceService.devicesSessionRatio();

        return { data };
    }
}
