import type { IAnalyticMfaAttemptSnapshot } from '@modules/analytic/interfaces/analytic.interface';

export interface IMfaAnalyticRepository {
    countEnabled(): Promise<number>;
    countAll(): Promise<number>;
    findAttemptSnapshot(): Promise<IAnalyticMfaAttemptSnapshot>;
}
