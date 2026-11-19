import type { EnumTermPolicyType } from '@generated/prisma-client/client';
import type {
    IAnalyticTermPolicyAcceptanceCount,
    IAnalyticTermPolicyTimeToAcceptAverage,
} from '@modules/analytic/interfaces/analytic.interface';

export interface IAnalyticTermPolicyRepository {
    findAcceptanceCounts(
        types: EnumTermPolicyType[],
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticTermPolicyAcceptanceCount>;
    findTimeToAccept(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticTermPolicyTimeToAcceptAverage>;
}
