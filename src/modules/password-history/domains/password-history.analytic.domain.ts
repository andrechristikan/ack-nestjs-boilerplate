import type { IPasswordHistoryAnalytic } from '@modules/password-history/interfaces/password-history.interface';
import { PasswordHistoryAnalyticRepository } from '@modules/password-history/repositories/password-history.analytic.repository';
import { Injectable } from '@nestjs/common';
import { EnumPasswordHistoryType } from '@generated/prisma-client/client';

@Injectable()
export class PasswordHistoryAnalyticDomain {
    constructor(
        private readonly passwordHistoryAnalyticRepository: PasswordHistoryAnalyticRepository
    ) {}

    getCountByTypeInRange(
        type: EnumPasswordHistoryType,
        startDate: Date,
        endDate: Date
    ): Promise<number> {
        return this.passwordHistoryAnalyticRepository.countByTypeInRange(
            type,
            startDate,
            endDate
        );
    }

    getByTypeInRange(
        type: EnumPasswordHistoryType,
        startDate: Date,
        endDate: Date
    ): Promise<IPasswordHistoryAnalytic[]> {
        return this.passwordHistoryAnalyticRepository.findByTypeInRange(
            type,
            startDate,
            endDate
        );
    }
}
