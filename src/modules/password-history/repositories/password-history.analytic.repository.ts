import { DatabaseService } from '@common/database/services/database.service';
import type { IPasswordHistoryAnalyticRepository } from '@modules/password-history/interfaces/password-history.analytic-repository.interface';
import type { IPasswordHistoryAnalytic } from '@modules/password-history/interfaces/password-history.interface';
import { Injectable } from '@nestjs/common';
import { EnumPasswordHistoryType } from '@generated/prisma-client/client';

@Injectable()
export class PasswordHistoryAnalyticRepository implements IPasswordHistoryAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async countByTypeInRange(
        type: EnumPasswordHistoryType,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        return this.databaseService.client.passwordHistory.count({
            where: {
                type,
                createdAt: { gte: startDate, lt: endDate },
            },
        });
    }

    async findByTypeInRange(
        type: EnumPasswordHistoryType,
        startDate: Date,
        endDate: Date
    ): Promise<IPasswordHistoryAnalytic[]> {
        return this.databaseService.client.passwordHistory.findMany({
            where: {
                type,
                createdAt: { gte: startDate, lt: endDate },
            },
            select: { id: true, userId: true, type: true, createdAt: true },
        });
    }
}
