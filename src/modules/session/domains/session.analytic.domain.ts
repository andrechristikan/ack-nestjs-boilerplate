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
        endDate: Date | null
    ): Promise<ISessionAnalyticSession[]> {
        return this.sessionAnalyticRepository.findActiveWithGeoInRange(
            startDate,
            endDate
        );
    }

    getCountActiveByUser(): Promise<ISessionAnalyticUserCount[]> {
        return this.sessionAnalyticRepository.countActiveByUser();
    }

    getGroupByCountry(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticCountBucket[]> {
        return this.sessionAnalyticRepository.groupByCountry(
            startDate,
            endDate
        );
    }

    getCountAll(): Promise<number> {
        return this.sessionAnalyticRepository.countAll();
    }

    getCountActive(): Promise<number> {
        return this.sessionAnalyticRepository.countActive();
    }
}
