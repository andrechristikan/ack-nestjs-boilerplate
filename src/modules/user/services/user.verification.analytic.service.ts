import { HelperNumberService } from '@common/helper/services/helper.number.service';
import type { IAnalyticVerificationFunnel } from '@modules/analytic/interfaces/analytic.interface';
import { UserVerificationAnalyticRepository } from '@modules/user/repositories/user.verification.analytic.repository';
import { Injectable } from '@nestjs/common';
import { EnumVerificationType } from '@generated/prisma-client/client';

@Injectable()
export class UserVerificationAnalyticService {
    constructor(
        private readonly userVerificationAnalyticRepository: UserVerificationAnalyticRepository,
        private readonly helperNumberService: HelperNumberService
    ) {}

    async getFunnel(
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
        const rate = this.helperNumberService.percent(used, total);
        return { used, unused, total, rate };
    }
}
