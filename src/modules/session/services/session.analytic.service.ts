import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import type {
    ISessionAnalyticSession,
    ISessionAnalyticUserCount,
} from '@modules/session/interfaces/session.interface';
import { SessionAnalyticRepository } from '@modules/session/repositories/session.analytic.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionAnalyticService {
    constructor(
        private readonly sessionAnalyticRepository: SessionAnalyticRepository
    ) {}

    async getActiveInRange(
        startDate: Date | null,
        endDate: Date | null,
        now: Date
    ): Promise<ISessionAnalyticSession[]> {
        return await this.sessionAnalyticRepository.findActiveInRange(
            startDate,
            endDate,
            now
        );
    }

    async getActiveWithGeoInRange(
        startDate: Date | null,
        endDate: Date | null,
        now: Date
    ): Promise<ISessionAnalyticSession[]> {
        return await this.sessionAnalyticRepository.findActiveWithGeoInRange(
            startDate,
            endDate,
            now
        );
    }

    async getCountActiveByUser(
        now: Date
    ): Promise<ISessionAnalyticUserCount[]> {
        return await this.sessionAnalyticRepository.countActiveByUser(now);
    }

    async getGroupByCountry(
        startDate: Date | null,
        endDate: Date | null,
        now: Date
    ): Promise<IAnalyticCountBucket[]> {
        return await this.sessionAnalyticRepository.groupByCountry(
            startDate,
            endDate,
            now
        );
    }

    async getCountAll(): Promise<number> {
        return await this.sessionAnalyticRepository.countAll();
    }

    async getCountActive(now: Date): Promise<number> {
        return await this.sessionAnalyticRepository.countActive(now);
    }
}
