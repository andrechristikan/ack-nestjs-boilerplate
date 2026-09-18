import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IRequestGeoLocation,
    IRequestUserAgent,
} from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';

export interface ISessionAnalyticSessionRow {
    id: string;
    userId: string;
    ipAddress: string | null;
    createdAt: Date;
    geoLocation: IRequestGeoLocation | null;
    userAgent: IRequestUserAgent;
}

export interface ISessionAnalyticUserCount {
    userId: string;
    count: number;
}

export interface ISessionAnalyticListRow {
    id: string;
    userId: string;
    createdAt: Date;
    ipAddress: string | null;
}

export interface ISessionAnalyticRepository {
    findActiveWithGeoInRange(
        startDate?: Date,
        endDate?: Date
    ): Promise<ISessionAnalyticSessionRow[]>;
    countActiveByUser(): Promise<ISessionAnalyticUserCount[]>;
    groupByCountry(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticCountBucket[]>;
    countAll(): Promise<number>;
    countActive(): Promise<number>;
    listOffset(
        params: IPaginationQueryOffsetParams<Prisma.SessionWhereInput>
    ): Promise<IResponsePagingReturn<ISessionAnalyticListRow>>;
}
