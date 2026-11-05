import { DatabaseService } from '@common/database/services/database.service';
import type { IUserForgotPasswordAnalyticRepository } from '@modules/user/interfaces/user.forgot-password-analytic-repository.interface';
import type { IUserForgotPasswordAnalyticUserCount } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserForgotPasswordAnalyticRepository implements IUserForgotPasswordAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async countCreated(startDate: Date, endDate: Date): Promise<number> {
        return this.databaseService.client.forgotPassword.count({
            where: { createdAt: { gte: startDate, lt: endDate } },
        });
    }

    async countUsed(startDate: Date, endDate: Date): Promise<number> {
        return this.databaseService.client.forgotPassword.count({
            where: {
                isUsed: true,
                createdAt: { gte: startDate, lt: endDate },
            },
        });
    }

    async groupUnusedTokenByUser(
        startDate: Date,
        endDate: Date,
        min: number
    ): Promise<IUserForgotPasswordAnalyticUserCount[]> {
        const rows = await this.databaseService.client.forgotPassword.groupBy({
            by: ['userId'],
            where: {
                isUsed: false,
                createdAt: { gte: startDate, lt: endDate },
            },
            _count: { _all: true },
            having: { userId: { _count: { gte: min } } },
        });
        return rows.map(r => ({ userId: r.userId, count: r._count._all }));
    }
}
