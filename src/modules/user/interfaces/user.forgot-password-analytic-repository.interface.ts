import type { IUserForgotPasswordAnalyticUserCount } from '@modules/user/interfaces/user.interface';

export interface IUserForgotPasswordAnalyticRepository {
    countCreated(startDate: Date, endDate: Date): Promise<number>;
    countUsed(startDate: Date, endDate: Date): Promise<number>;
    groupUnusedTokenByUser(
        startDate: Date,
        endDate: Date,
        min: number
    ): Promise<IUserForgotPasswordAnalyticUserCount[]>;
}
