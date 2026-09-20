import type {
    IUserForgotPasswordAnalytic,
    IUserForgotPasswordAnalyticUserCount,
} from '@modules/user/interfaces/user.interface';

export interface IUserForgotPasswordAnalyticRepository {
    countCreated(startDate: Date, endDate: Date): Promise<number>;
    countUsed(startDate: Date, endDate: Date): Promise<number>;
    findCreatedInRange(
        startDate: Date,
        endDate: Date
    ): Promise<IUserForgotPasswordAnalytic[]>;
    unusedTokenCountsByUser(
        startDate: Date,
        endDate: Date
    ): Promise<IUserForgotPasswordAnalyticUserCount[]>;
}
