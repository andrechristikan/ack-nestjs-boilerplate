import { EnumVerificationType } from '@generated/prisma-client/client';
import type { IUserVerificationAnalyticUsedBucket } from '@modules/user/interfaces/user.interface';

export interface IUserVerificationAnalyticRepository {
    groupByUsed(
        type: EnumVerificationType,
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IUserVerificationAnalyticUsedBucket[]>;
}
