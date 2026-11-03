import { DatabaseService } from '@common/database/services/database.service';
import type { IAnalyticTwoFactorAttemptSnapshot } from '@modules/analytic/interfaces/analytic.interface';
import type { IUserTwoFactorAnalyticRepository } from '@modules/user/interfaces/user.two-factor-analytic-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserTwoFactorAnalyticRepository implements IUserTwoFactorAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async countEnabled(): Promise<number> {
        return this.databaseService.client.twoFactor.count({
            where: { enabled: true, user: { deletedAt: null } },
        });
    }

    async countAll(): Promise<number> {
        return this.databaseService.client.twoFactor.count();
    }

    async findAttemptSnapshot(): Promise<IAnalyticTwoFactorAttemptSnapshot> {
        const result = await this.databaseService.client.twoFactor.aggregate({
            where: { attempt: { gt: 0 } },
            _count: { _all: true },
            _sum: { attempt: true },
        });
        return {
            usersWithAttempts: result._count._all,
            totalAttempts: result._sum.attempt ?? 0,
        };
    }
}
