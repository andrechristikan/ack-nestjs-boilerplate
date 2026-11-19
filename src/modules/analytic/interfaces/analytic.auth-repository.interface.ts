import type {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
} from '@generated/prisma-client/client';
import type { IActivityLogAnalyticActionCount } from '@modules/activity-log/interfaces/activity-log.interface';
import type {
    IAnalyticCountBucket,
    IAnalyticGroupCount,
    IAnalyticMfaAdoptionCount,
    IAnalyticUsedGroupCount,
    IAnalyticVerificationGroupCount,
} from '@modules/analytic/interfaces/analytic.interface';

export interface IAnalyticAuthRepository {
    countActivityByActions(
        actions: EnumActivityLogAction[],
        startDate: Date,
        endDate: Date
    ): Promise<number>;
    groupActivityByAction(
        actions: EnumActivityLogAction[],
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IActivityLogAnalyticActionCount[]>;
    findConcurrentSessions(
        now: Date,
        idleSince: Date
    ): Promise<IAnalyticCountBucket[]>;
    groupSessionsGeo(
        startDate: Date,
        endDate: Date,
        now: Date,
        idleSince: Date
    ): Promise<IAnalyticGroupCount[]>;
    groupSessionsUserAgent(
        startDate: Date,
        endDate: Date,
        now: Date,
        idleSince: Date
    ): Promise<IAnalyticGroupCount[]>;
    groupVerificationFunnel(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticVerificationGroupCount[]>;
    countPasswordHistoryByType(
        type: EnumPasswordHistoryType,
        startDate: Date,
        endDate: Date
    ): Promise<number>;
    groupForgotPasswordConversion(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticUsedGroupCount[]>;
    findMfaAdoption(): Promise<IAnalyticMfaAdoptionCount>;
}
