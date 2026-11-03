import { DatabaseService } from '@common/database/services/database.service';
import type { IUserMobileNumberAnalyticRepository } from '@modules/user/interfaces/user.mobile-number-analytic-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserMobileNumberAnalyticRepository implements IUserMobileNumberAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async countVerified(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<number> {
        return this.databaseService.client.userMobileNumber.count({
            where: {
                isVerified: true,
                user: { deletedAt: null },
                ...(startDate &&
                    endDate && { createdAt: { gte: startDate, lt: endDate } }),
            },
        });
    }

    async countAll(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<number> {
        return this.databaseService.client.userMobileNumber.count({
            where: {
                user: { deletedAt: null },
                ...(startDate &&
                    endDate && { createdAt: { gte: startDate, lt: endDate } }),
            },
        });
    }
}
