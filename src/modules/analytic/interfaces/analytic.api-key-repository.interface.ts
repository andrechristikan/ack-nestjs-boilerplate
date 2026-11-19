import type { IActivityLogAnalyticActionCount } from '@modules/activity-log/interfaces/activity-log.interface';
import type {
    IAnalyticApiKeyActiveExpired,
    IAnalyticCountBucket,
} from '@modules/analytic/interfaces/analytic.interface';

export interface IAnalyticApiKeyRepository {
    groupLifecycle(
        startDate: Date,
        endDate: Date
    ): Promise<IActivityLogAnalyticActionCount[]>;
    findActiveExpired(now: Date): Promise<IAnalyticApiKeyActiveExpired>;
    groupType(): Promise<IAnalyticCountBucket[]>;
}
