import type { IAnalyticForgotPasswordConversion } from '@modules/analytic/interfaces/analytic.interface';
import type { IUserForgotPasswordAnalyticUserCount } from '@modules/user/interfaces/user.interface';
import { UserForgotPasswordAnalyticRepository } from '@modules/user/repositories/user.forgot-password.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserForgotPasswordAnalyticDomain {
    constructor(
        private readonly userForgotPasswordAnalyticRepository: UserForgotPasswordAnalyticRepository
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
        return {
            created,
            used,
            rate: created === 0 ? 0 : (used / created) * 100,
        };
    }

    getUnusedTokenCountsByUser(
        startDate: Date,
        endDate: Date
    ): Promise<IUserForgotPasswordAnalyticUserCount[]> {
        return this.userForgotPasswordAnalyticRepository.groupUnusedTokenByUser(
            startDate,
            endDate
        );
    }
}
