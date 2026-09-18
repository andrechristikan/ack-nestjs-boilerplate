import { DatabaseService } from '@common/database/services/database.service';
import type { IAnalyticTwoFactorAttemptSnapshot } from '@modules/analytic/interfaces/analytic.interface';
import type { IUserTwoFactorAnalyticRepository } from '@modules/user/interfaces/user.two-factor-analytic-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserTwoFactorAnalyticRepository implements IUserTwoFactorAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async countEnabled(): Promise<number> {
        return this.databaseService.client.twoFactor.count({
            where: { enabled: true },
        });
    }

    async countAll(): Promise<number> {
        return this.databaseService.client.twoFactor.count();
    }

    async attemptSnapshot(): Promise<IAnalyticTwoFactorAttemptSnapshot> {
        const rows = await this.databaseService.client.twoFactor.findMany({
            where: { attempt: { gt: 0 } },
            select: { userId: true, attempt: true },
        });
        return {
            usersWithAttempts: rows.length,
            totalAttempts: rows.reduce((s, r) => s + r.attempt, 0),
        };
    }
}
