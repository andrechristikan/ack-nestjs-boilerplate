import type { EnumTermPolicyType } from '@generated/prisma-client/client';
import type { IAnalyticTermPolicyAcceptanceCount } from '@modules/analytic/interfaces/analytic.interface';

export interface IAnalyticTermPolicyRepository {
    findAcceptanceCounts(
        types: EnumTermPolicyType[],
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticTermPolicyAcceptanceCount>;
}
