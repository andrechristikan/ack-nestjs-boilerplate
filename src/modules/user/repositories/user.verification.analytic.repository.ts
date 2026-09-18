import { DatabaseService } from '@common/database/services/database.service';
import type { IUserVerificationAnalyticRepository } from '@modules/user/interfaces/user.verification-analytic-repository.interface';
import type { IUserVerificationAnalyticUsedBucket } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import { EnumVerificationType } from '@generated/prisma-client/client';

@Injectable()
export class UserVerificationAnalyticRepository implements IUserVerificationAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async groupByUsed(
        type: EnumVerificationType,
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IUserVerificationAnalyticUsedBucket[]> {
        const rows = await this.databaseService.client.verification.groupBy({
            by: ['isUsed'],
            where: {
                type,
                ...(startDate && endDate
                    ? { createdAt: { gte: startDate, lt: endDate } }
                    : {}),
            },
            _count: { _all: true },
        });
        return rows.map(r => ({ isUsed: r.isUsed, count: r._count._all }));
    }
}
