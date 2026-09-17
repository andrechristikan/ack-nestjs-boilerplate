import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import type {
    ISessionAnalyticListRow,
    ISessionAnalyticSessionRow,
    ISessionAnalyticUserCount,
} from '@modules/session/interfaces/session.analytic.repository.interface';
import { SessionAnalyticRepository } from '@modules/session/repositories/session.analytic.repository';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';

@Injectable()
export class SessionAnalyticDomain {
    constructor(
        private readonly sessionAnalyticRepository: SessionAnalyticRepository
    ) {}

    findActiveWithGeoInRange(
        startDate?: Date,
        endDate?: Date
    ): Promise<ISessionAnalyticSessionRow[]> {
        return this.sessionAnalyticRepository.findActiveWithGeoInRange(
            startDate,
            endDate
        );
    }

    countActiveByUser(): Promise<ISessionAnalyticUserCount[]> {
        return this.sessionAnalyticRepository.countActiveByUser();
    }

    groupByCountry(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticCountBucket[]> {
        return this.sessionAnalyticRepository.groupByCountry(
            startDate,
            endDate
        );
    }

    countAll(): Promise<number> {
        return this.sessionAnalyticRepository.countAll();
    }

    countActive(): Promise<number> {
        return this.sessionAnalyticRepository.countActive();
    }

    listOffset(
        params: IPaginationQueryOffsetParams<Prisma.SessionWhereInput>
    ): Promise<IResponsePagingReturn<ISessionAnalyticListRow>> {
        return this.sessionAnalyticRepository.listOffset(params);
    }
}
