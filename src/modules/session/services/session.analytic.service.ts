import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import type {
    ISessionAnalyticSession,
    ISessionAnalyticUserCount,
} from '@modules/session/interfaces/session.interface';
import { SessionAnalyticRepository } from '@modules/session/repositories/session.analytic.repository';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';

@Injectable()
export class SessionAnalyticService {
    private readonly idleTimeoutInMs: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly sessionAnalyticRepository: SessionAnalyticRepository
    ) {
        this.idleTimeoutInMs = this.configService.get<number>(
            'session.idleTimeoutInMs'
        )!;
    }

    async getActiveInRange(
        startDate: Date | null,
        endDate: Date | null,
        now: Date
    ): Promise<ISessionAnalyticSession[]> {
        const idleSince = this.helperDateService.backward(
            now,
            Duration.fromObject({ milliseconds: this.idleTimeoutInMs })
        );

        return await this.sessionAnalyticRepository.findActiveInRange(
            startDate,
            endDate,
            now,
            idleSince
        );
    }

    async getActiveWithGeoInRange(
        startDate: Date | null,
        endDate: Date | null,
        now: Date
    ): Promise<ISessionAnalyticSession[]> {
        const idleSince = this.helperDateService.backward(
            now,
            Duration.fromObject({ milliseconds: this.idleTimeoutInMs })
        );

        return await this.sessionAnalyticRepository.findActiveWithGeoInRange(
            startDate,
            endDate,
            now,
            idleSince
        );
    }

    async getCountActiveByUser(
        now: Date
    ): Promise<ISessionAnalyticUserCount[]> {
        const idleSince = this.helperDateService.backward(
            now,
            Duration.fromObject({ milliseconds: this.idleTimeoutInMs })
        );

        return await this.sessionAnalyticRepository.countActiveByUser(
            now,
            idleSince
        );
    }

    async getGroupByCountry(
        startDate: Date | null,
        endDate: Date | null,
        now: Date
    ): Promise<IAnalyticCountBucket[]> {
        const idleSince = this.helperDateService.backward(
            now,
            Duration.fromObject({ milliseconds: this.idleTimeoutInMs })
        );

        return await this.sessionAnalyticRepository.groupByCountry(
            startDate,
            endDate,
            now,
            idleSince
        );
    }

    async getCountAll(): Promise<number> {
        return await this.sessionAnalyticRepository.countAll();
    }

    async getCountActive(now: Date): Promise<number> {
        const idleSince = this.helperDateService.backward(
            now,
            Duration.fromObject({ milliseconds: this.idleTimeoutInMs })
        );

        return await this.sessionAnalyticRepository.countActive(now, idleSince);
    }
}
