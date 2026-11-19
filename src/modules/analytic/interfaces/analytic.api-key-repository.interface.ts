import type { IAnalyticApiKeyActiveExpired } from '@modules/analytic/interfaces/analytic.interface';

export interface IAnalyticApiKeyRepository {
    findActiveExpired(now: Date): Promise<IAnalyticApiKeyActiveExpired>;
}
