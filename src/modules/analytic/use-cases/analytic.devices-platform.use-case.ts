import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticDeviceService } from '@modules/analytic/services/analytic.device.service';
import type { IAnalyticBucketsResult } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticDevicesPlatformUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticBucketsResult>
> {
    constructor(
        private readonly analyticDeviceService: AnalyticDeviceService
    ) {}

    async execute(): Promise<IResponseReturn<IAnalyticBucketsResult>> {
        const data = await this.analyticDeviceService.devicesPlatform();

        return { data };
    }
}
