import { HelperNumberService } from '@common/helper/services/helper.number.service';
import type { IAnalyticForgotPasswordConversion } from '@modules/analytic/interfaces/analytic.interface';
import type { IUserForgotPasswordAnalyticUserCount } from '@modules/user/interfaces/user.interface';
import { UserForgotPasswordAnalyticRepository } from '@modules/user/repositories/user.forgot-password.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserForgotPasswordAnalyticDomain {
    constructor(
        private readonly userForgotPasswordAnalyticRepository: UserForgotPasswordAnalyticRepository,
        private readonly helperNumberService: HelperNumberService
    ) {}

    async getConversion(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticForgotPasswordConversion> {
        const [created, used] = await Promise.all([
            this.userForgotPasswordAnalyticRepository.countCreated(
                startDate,
                endDate
            ),
            this.userForgotPasswordAnalyticRepository.countUsed(
                startDate,
                endDate
            ),
        ]);
        const rate = this.helperNumberService.percent(used, created);
        return { created, used, rate };
    }

    async getUnusedTokenCountsByUser(
        startDate: Date,
        endDate: Date,
        min: number
    ): Promise<IUserForgotPasswordAnalyticUserCount[]> {
        return await this.userForgotPasswordAnalyticRepository.groupUnusedTokenByUser(
            startDate,
            endDate,
            min
        );
    }
}
