import type { IAnalyticVerificationFunnel } from '@modules/analytic/interfaces/analytic.interface';
import { UserVerificationAnalyticRepository } from '@modules/user/repositories/user.verification.analytic.repository';
import { Injectable } from '@nestjs/common';
import { EnumVerificationType } from '@generated/prisma-client/client';

@Injectable()
export class UserVerificationAnalyticDomain {
    constructor(
        private readonly userVerificationAnalyticRepository: UserVerificationAnalyticRepository
    ) {}

    async funnel(
        type: EnumVerificationType,
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticVerificationFunnel> {
        const rows = await this.userVerificationAnalyticRepository.groupByUsed(
            type,
            startDate,
            endDate
        );
        const used = rows.find(r => r.isUsed)?.count ?? 0;
        const unused = rows.find(r => !r.isUsed)?.count ?? 0;
        const total = used + unused;
        return {
            used,
            unused,
            total,
            rate: total === 0 ? 0 : (used / total) * 100,
        };
    }
}
