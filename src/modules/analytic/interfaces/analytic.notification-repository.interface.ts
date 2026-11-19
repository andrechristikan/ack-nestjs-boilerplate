import type { IAnalyticNotificationDelivery } from '@modules/analytic/interfaces/analytic.interface';

export interface IAnalyticNotificationRepository {
    groupDelivery(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticNotificationDelivery[]>;
}
