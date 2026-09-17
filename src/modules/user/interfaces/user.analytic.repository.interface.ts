import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    Prisma,
} from '@generated/prisma-client/client';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import type { IAnalyticNearLockoutRow } from '@modules/analytic/interfaces/analytic.anomaly.interface';

export interface IUserAnalyticGroupCount<T extends string = string> {
    key: T;
    count: number;
}

export interface IUserAnalyticSignUpRow {
    id: string;
    email: string;
    signUpAt: Date;
    signUpFrom: EnumUserSignUpFrom;
}

export interface IUserAnalyticRef {
    id: string;
    email: string;
    passwordAttempt: number | null;
}

export interface IUserAnalyticRepository {
    countRegistrations(startDate: Date, endDate: Date): Promise<number>;
    countDeletedInRange(startDate: Date, endDate: Date): Promise<number>;
    countRegisteredUntil(endDate: Date): Promise<number>;
    countByStatus(status: EnumUserStatus): Promise<number>;
    groupBySignUpWith(
        startDate?: Date,
        endDate?: Date
    ): Promise<IUserAnalyticGroupCount<EnumUserSignUpWith>[]>;
    groupBySignUpFrom(
        startDate?: Date,
        endDate?: Date
    ): Promise<IUserAnalyticGroupCount<EnumUserSignUpFrom>[]>;
    groupByStatus(): Promise<IUserAnalyticGroupCount<EnumUserStatus>[]>;
    groupByCountry(): Promise<IAnalyticCountBucket[]>;
    groupByRole(): Promise<IAnalyticCountBucket[]>;
    countVerifiedEmail(): Promise<number>;
    countActive(): Promise<number>;
    countPasswordExpired(now: Date): Promise<number>;
    findNearLockout(minAttempt: number): Promise<IAnalyticNearLockoutRow[]>;
    groupPasswordAttemptBuckets(): Promise<IAnalyticCountBucket[]>;
    findOneById(id: string): Promise<IUserAnalyticRef | null>;
    listNearLockoutOffset(
        minAttempt: number,
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticNearLockoutRow>>;
    findSignUpsInRange(
        startDate: Date,
        endDate: Date
    ): Promise<IUserAnalyticSignUpRow[]>;
}
