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

    getActiveWithGeoInRange(
        startDate: Date | null,
        endDate: Date | null,
        now: Date
    ): Promise<ISessionAnalyticSession[]> {
        return this.sessionAnalyticRepository.findActiveWithGeoInRange(
            startDate,
            endDate,
            now
        );
    }

    getCountActiveByUser(now: Date): Promise<ISessionAnalyticUserCount[]> {
        return this.sessionAnalyticRepository.countActiveByUser(now);
    }

    getGroupByCountry(
        startDate: Date | null,
        endDate: Date | null,
        now: Date
    ): Promise<IAnalyticCountBucket[]> {
        return this.sessionAnalyticRepository.groupByCountry(
            startDate,
            endDate,
            now
        );
    }

    getCountAll(): Promise<number> {
        return this.sessionAnalyticRepository.countAll();
    }

    getCountActive(now: Date): Promise<number> {
        return this.sessionAnalyticRepository.countActive(now);
    }
}
