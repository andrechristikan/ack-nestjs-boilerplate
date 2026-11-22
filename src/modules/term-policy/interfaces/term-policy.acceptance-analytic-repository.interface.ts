import type {
    ITermPolicyAcceptanceAnalytic,
    ITermPolicyAnalyticLatest,
} from '@modules/term-policy/interfaces/term-policy.interface';

export interface ITermPolicyAcceptanceAnalyticRepository {
    countAcceptances(
        latest: ITermPolicyAnalyticLatest[],
        startDate: Date | null,
        endDate: Date | null
    ): Promise<number>;
    findAcceptances(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<ITermPolicyAcceptanceAnalytic[]>;
}
