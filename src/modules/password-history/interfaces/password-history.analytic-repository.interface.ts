import { EnumPasswordHistoryType } from '@generated/prisma-client/client';
import type { IPasswordHistoryAnalytic } from '@modules/password-history/interfaces/password-history.interface';

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
    ): Promise<IPasswordHistoryAnalytic[]>;
}
