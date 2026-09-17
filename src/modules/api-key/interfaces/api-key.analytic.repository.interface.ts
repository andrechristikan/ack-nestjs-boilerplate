import { EnumApiKeyType } from '@generated/prisma-client/client';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';

export interface IApiKeyAnalyticCreatedRow {
    id: string;
    type: EnumApiKeyType;
    createdAt: Date;
    createdBy: string | null;
}

export interface IApiKeyAnalyticRepository {
    countCreated(startDate: Date, endDate: Date): Promise<number>;
    countActive(): Promise<number>;
    countExpired(): Promise<number>;
    groupByType(): Promise<IAnalyticCountBucket[]>;
    findCreatedInRange(
        startDate: Date,
        endDate: Date
    ): Promise<IApiKeyAnalyticCreatedRow[]>;
}
