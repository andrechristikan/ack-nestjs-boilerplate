import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import type {
    ISessionAnalyticSession,
    ISessionAnalyticUserCount,
} from '@modules/session/interfaces/session.interface';
import { SessionAnalyticRepository } from '@modules/session/repositories/session.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionAnalyticDomain {
    constructor(
        private readonly sessionAnalyticRepository: SessionAnalyticRepository
    ) {}

    findActiveWithGeoInRange(
        startDate?: Date,
        endDate?: Date
    ): Promise<ISessionAnalyticSession[]> {
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
}
