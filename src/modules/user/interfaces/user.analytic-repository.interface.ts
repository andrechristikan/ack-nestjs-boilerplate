import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumUserLoginFrom,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    Prisma,
} from '@generated/prisma-client/client';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import type { IAnalyticNearLockout } from '@modules/analytic/interfaces/analytic.anomaly.interface';
import type {
    IUserAnalyticGroupCount,
    IUserAnalyticRef,
} from '@modules/user/interfaces/user.interface';

export interface IUserAnalyticRepository {
    countRegistrations(startDate: Date, endDate: Date): Promise<number>;
    countDeletedInRange(startDate: Date, endDate: Date): Promise<number>;
    countAliveAt(date: Date): Promise<number>;
    countByStatus(status: EnumUserStatus): Promise<number>;
    groupBySignUpWith(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IUserAnalyticGroupCount<EnumUserSignUpWith>[]>;
    groupBySignUpFrom(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IUserAnalyticGroupCount<EnumUserSignUpFrom>[]>;
    groupLoginSource(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IUserAnalyticGroupCount<EnumUserLoginFrom>[]>;
    groupByStatus(): Promise<IUserAnalyticGroupCount<EnumUserStatus>[]>;
    groupByCountry(): Promise<IAnalyticCountBucket[]>;
    groupByRole(): Promise<IAnalyticCountBucket[]>;
    countVerifiedEmail(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<number>;
    countSignedUp(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<number>;
    countActive(): Promise<number>;
    countPasswordExpired(now: Date): Promise<number>;
    findNearLockout(
        minAttempt: number,
        limit: number
    ): Promise<IAnalyticNearLockout[]>;
    countNearLockout(minAttempt: number): Promise<number>;
    groupPasswordAttemptBuckets(): Promise<IAnalyticCountBucket[]>;
    findOneById(id: string): Promise<IUserAnalyticRef | null>;
    findManyByIds(ids: string[]): Promise<IUserAnalyticRef[]>;
    findNearLockoutOffset(
        minAttempt: number,
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticNearLockout>>;
}
