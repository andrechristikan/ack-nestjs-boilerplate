import type {
    IAnalyticActiveUsersCount,
    IAnalyticBlockedUsers,
    IAnalyticChurnCount,
    IAnalyticCountBucket,
    IAnalyticVerifiedGroupCount,
} from '@modules/analytic/interfaces/analytic.interface';

export interface IAnalyticUserRepository {
    countRegistrations(startDate: Date, endDate: Date): Promise<number>;
    findChurnCounts(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticChurnCount>;
    findBlockedCounts(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticBlockedUsers>;
    findActiveCounts(
        dailySince: Date,
        weeklySince: Date,
        monthlySince: Date
    ): Promise<IAnalyticActiveUsersCount>;
    groupSignUpWith(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticCountBucket[]>;
    groupEmailVerification(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticVerifiedGroupCount[]>;
    groupStatus(): Promise<IAnalyticCountBucket[]>;
    groupCountry(): Promise<IAnalyticCountBucket[]>;
    groupRole(): Promise<IAnalyticCountBucket[]>;
}
