import { EnumVerificationType } from '@generated/prisma-client';
export interface IUserVerificationAnalyticUsedBucket {
    isUsed: boolean;
    count: number;
}

export interface IUserVerificationAnalyticRepository {
    groupByUsed(
        type: EnumVerificationType,
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IUserVerificationAnalyticUsedBucket[]>;
}
