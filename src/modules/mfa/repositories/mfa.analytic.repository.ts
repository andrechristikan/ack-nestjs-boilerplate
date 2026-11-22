import { DatabaseService } from '@common/database/services/database.service';
import type { IAnalyticMfaAttemptSnapshot } from '@modules/analytic/interfaces/analytic.interface';
import type { IMfaAnalyticRepository } from '@modules/mfa/interfaces/mfa.analytic-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MfaAnalyticRepository implements IMfaAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async countEnabled(): Promise<number> {
        return this.databaseService.client.mfa.count({
            where: {
                user: {
                    deletedAt: null,
                    OR: [
                        { mfaTotp: { is: { secret: { not: null } } } },
                        { mfaPasskeys: { some: {} } },
                    ],
                },
            },
        });
    }

    async countAll(): Promise<number> {
        return this.databaseService.client.mfa.count();
    }

    async findAttemptSnapshot(): Promise<IAnalyticMfaAttemptSnapshot> {
        const result = await this.databaseService.client.mfa.aggregate({
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
