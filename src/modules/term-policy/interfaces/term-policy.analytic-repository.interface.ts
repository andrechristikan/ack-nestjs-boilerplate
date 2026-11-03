import type { EnumTermPolicyType } from '@generated/prisma-client/client';
import type { ITermPolicyAnalyticLatest } from '@modules/term-policy/interfaces/term-policy.interface';

export interface ITermPolicyAnalyticRepository {
    groupLatestPublishedByTypes(
        types: EnumTermPolicyType[]
    ): Promise<ITermPolicyAnalyticLatest[]>;
}
