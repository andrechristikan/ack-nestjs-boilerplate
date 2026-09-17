import { EnumPasswordHistoryType } from '@generated/prisma-client/client';

export interface IPasswordHistoryAnalyticRow {
    id: string;
    userId: string;
    type: EnumPasswordHistoryType;
    createdAt: Date;
}

export interface IPasswordHistoryAnalyticRepository {
    countByTypeInRange(
        type: EnumPasswordHistoryType,
        startDate: Date,
        endDate: Date
    ): Promise<number>;
    findByTypeInRange(
        type: EnumPasswordHistoryType,
        startDate: Date,
        endDate: Date
    ): Promise<IPasswordHistoryAnalyticRow[]>;
}
