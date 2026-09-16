export interface IUserForgotPasswordAnalyticRow {
    id: string;
    userId: string;
    isUsed: boolean;
    createdAt: Date;
    to: string;
}

export interface IUserForgotPasswordAnalyticUserCount {
    userId: string;
    count: number;
}

export interface IUserForgotPasswordAnalyticRepository {
    countCreated(startDate: Date, endDate: Date): Promise<number>;
    countUsed(startDate: Date, endDate: Date): Promise<number>;
    findCreatedInRange(
        startDate: Date,
        endDate: Date
    ): Promise<IUserForgotPasswordAnalyticRow[]>;
    unusedTokenCountsByUser(
        startDate: Date,
        endDate: Date
    ): Promise<IUserForgotPasswordAnalyticUserCount[]>;
}
