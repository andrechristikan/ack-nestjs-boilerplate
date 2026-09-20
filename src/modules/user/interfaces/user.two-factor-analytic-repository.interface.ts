import type { IAnalyticTwoFactorAttemptSnapshot } from '@modules/analytic/interfaces/analytic.interface';

export interface IUserTwoFactorAnalyticRepository {
    countEnabled(): Promise<number>;
    countAll(): Promise<number>;
    attemptSnapshot(): Promise<IAnalyticTwoFactorAttemptSnapshot>;
}
