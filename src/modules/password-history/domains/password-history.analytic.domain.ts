import { IPasswordHistoryAnalyticRow } from '@modules/password-history/interfaces/password-history.analytic.repository.interface';
import { PasswordHistoryAnalyticRepository } from '@modules/password-history/repositories/password-history.analytic.repository';
import { Injectable } from '@nestjs/common';
import { EnumPasswordHistoryType } from '@generated/prisma-client';

@Injectable()
export class PasswordHistoryAnalyticDomain {
    constructor(
        private readonly passwordHistoryAnalyticRepository: PasswordHistoryAnalyticRepository
    ) {}

    countByTypeInRange(
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

    findByTypeInRange(
        type: EnumPasswordHistoryType,
        startDate: Date,
        endDate: Date
    ): Promise<IPasswordHistoryAnalyticRow[]> {
        return this.passwordHistoryAnalyticRepository.findByTypeInRange(
            type,
            startDate,
            endDate
        );
    }
}
