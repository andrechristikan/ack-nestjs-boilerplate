import { DatabaseService } from '@common/database/services/database.service';
import type { IUserMobileNumberAnalyticRepository } from '@modules/user/interfaces/user.mobile-number-analytic-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserMobileNumberAnalyticRepository implements IUserMobileNumberAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async countVerified(): Promise<number> {
        return this.databaseService.client.userMobileNumber.count({
            where: { isVerified: true },
        });
    }

    async countAll(): Promise<number> {
        return this.databaseService.client.userMobileNumber.count();
    }
}
