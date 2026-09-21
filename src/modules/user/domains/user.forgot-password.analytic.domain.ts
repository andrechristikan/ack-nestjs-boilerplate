import type { IAnalyticForgotPasswordConversion } from '@modules/analytic/interfaces/analytic.interface';
import type {
    IUserForgotPasswordAnalytic,
    IUserForgotPasswordAnalyticUserCount,
} from '@modules/user/interfaces/user.interface';
import { UserForgotPasswordAnalyticRepository } from '@modules/user/repositories/user.forgot-password.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserForgotPasswordAnalyticDomain {
    constructor(
        private readonly userForgotPasswordAnalyticRepository: UserForgotPasswordAnalyticRepository
    ) {}

    async conversion(
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

    findCreatedInRange(
        startDate: Date,
        endDate: Date
    ): Promise<IUserForgotPasswordAnalytic[]> {
        return this.userForgotPasswordAnalyticRepository.findCreatedInRange(
            startDate,
            endDate
        );
    }

    unusedTokenCountsByUser(
        startDate: Date,
        endDate: Date
    ): Promise<IUserForgotPasswordAnalyticUserCount[]> {
        return this.userForgotPasswordAnalyticRepository.unusedTokenCountsByUser(
            startDate,
            endDate
        );
    }
}
