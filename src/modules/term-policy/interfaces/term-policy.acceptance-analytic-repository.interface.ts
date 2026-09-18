import type { ITermPolicyAcceptanceAnalytic } from '@modules/term-policy/interfaces/term-policy.interface';

export interface ITermPolicyAcceptanceAnalyticRepository {
    countAcceptances(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<number>;
    findAcceptances(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<ITermPolicyAcceptanceAnalytic[]>;
}
