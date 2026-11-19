import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticNotificationService } from '@modules/analytic/services/analytic.notification.service';
import type { IAnalyticNotificationDeliveryResult } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import type { AnalyticDateRangeRequestDto } from '@modules/analytic/dtos/request/analytic.date-range.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticNotificationsDeliveryUseCase implements IAppUseCase<
    [AnalyticDateRangeRequestDto],
    IResponseReturn<IAnalyticNotificationDeliveryResult>
> {
    constructor(
        private readonly analyticNotificationService: AnalyticNotificationService,
        private readonly analyticDateService: AnalyticDateService
    ) {}

    async execute({
        startDate,
        endDate,
    }: AnalyticDateRangeRequestDto): Promise<
        IResponseReturn<IAnalyticNotificationDeliveryResult>
    > {
        const range = this.analyticDateService.requireRange(startDate, endDate);
        const data =
            await this.analyticNotificationService.notificationsDelivery(
                range.startDate,
                range.endDate
            );

        return { data };
    }
}
