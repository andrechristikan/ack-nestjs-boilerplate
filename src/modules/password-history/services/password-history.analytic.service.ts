import type { IPasswordHistoryAnalytic } from '@modules/password-history/interfaces/password-history.interface';
import { PasswordHistoryAnalyticRepository } from '@modules/password-history/repositories/password-history.analytic.repository';
import { Injectable } from '@nestjs/common';
import { EnumPasswordHistoryType } from '@generated/prisma-client/client';

@Injectable()
export class PasswordHistoryAnalyticService {
    constructor(
        private readonly passwordHistoryAnalyticRepository: PasswordHistoryAnalyticRepository
    ) {}

    async getCountByTypeInRange(
        type: EnumPasswordHistoryType,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        return await this.passwordHistoryAnalyticRepository.countByTypeInRange(
            type,
            startDate,
            endDate
        );
    }

    async getByTypeInRange(
        type: EnumPasswordHistoryType,
        startDate: Date,
        endDate: Date
    ): Promise<IPasswordHistoryAnalytic[]> {
        return await this.passwordHistoryAnalyticRepository.findByTypeInRange(
            type,
            startDate,
            endDate
        );
    }
}
