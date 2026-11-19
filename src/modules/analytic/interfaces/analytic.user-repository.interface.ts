import type { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { IActivityLogAnalyticActionCount } from '@modules/activity-log/interfaces/activity-log.interface';
import type {
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
    groupSignUpWith(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticCountBucket[]>;
    groupSignUpFrom(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticCountBucket[]>;
    groupEmailVerification(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticVerifiedGroupCount[]>;
    groupMobileVerification(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticVerifiedGroupCount[]>;
    groupStatus(): Promise<IAnalyticCountBucket[]>;
    groupCountry(): Promise<IAnalyticCountBucket[]>;
    groupRole(): Promise<IAnalyticCountBucket[]>;
    countActivityByActions(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date
    ): Promise<number>;
    groupActivityByAction(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date
    ): Promise<IActivityLogAnalyticActionCount[]>;
}
