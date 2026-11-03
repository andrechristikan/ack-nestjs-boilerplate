import { DatabaseService } from '@common/database/services/database.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import { SessionAnalyticSelect } from '@modules/session/constants/session.constant';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import type { ISessionAnalyticRepository } from '@modules/session/interfaces/session.analytic-repository.interface';
import type {
    ISessionAnalyticSession,
    ISessionAnalyticUserCount,
} from '@modules/session/interfaces/session.interface';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@generated/prisma-client/client';

@Injectable()
export class SessionAnalyticRepository implements ISessionAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    private buildActiveWhere(
        startDate: Date | null,
        endDate: Date | null,
        now: Date
    ): Prisma.SessionWhereInput {
        return {
            isRevoked: false,
            expiredAt: { gt: now },
            ...(startDate &&
                endDate && { createdAt: { gte: startDate, lt: endDate } }),
        };
    }

    async findActiveInRange(
        startDate: Date | null,
        endDate: Date | null,
        now: Date
    ): Promise<ISessionAnalyticSession[]> {
        const where = this.buildActiveWhere(startDate, endDate, now);

        return this.databaseService.client.session.findMany({
            where,
            select: SessionAnalyticSelect,
            orderBy: [
                { userId: EnumPaginationOrderDirectionType.asc },
                { createdAt: EnumPaginationOrderDirectionType.asc },
            ],
        });
    }

    async findActiveWithGeoInRange(
        startDate: Date | null,
        endDate: Date | null,
        now: Date
    ): Promise<ISessionAnalyticSession[]> {
        const activeWhere = this.buildActiveWhere(startDate, endDate, now);

        return this.databaseService.client.session.findMany({
            where: {
                ...activeWhere,
                geoLocation: { isSet: true },
            },
            select: SessionAnalyticSelect,
            orderBy: [
                { userId: EnumPaginationOrderDirectionType.asc },
                { createdAt: EnumPaginationOrderDirectionType.asc },
            ],
        });
    }

    async countActiveByUser(now: Date): Promise<ISessionAnalyticUserCount[]> {
        const rows = await this.databaseService.client.session.groupBy({
            by: ['userId'],
            where: { isRevoked: false, expiredAt: { gt: now } },
            _count: { _all: true },
        });
        return rows.map(r => ({ userId: r.userId, count: r._count._all }));
    }

    async groupByCountry(
        startDate: Date | null,
        endDate: Date | null,
        now: Date
    ): Promise<IAnalyticCountBucket[]> {
        const sessions = await this.findActiveWithGeoInRange(
            startDate,
            endDate,
            now
        );
        const map = new Map<string, number>();
        for (const s of sessions) {
            const country = s.geoLocation?.country ?? 'unknown';
            map.set(country, (map.get(country) ?? 0) + 1);
        }
        return [...map.entries()].map(([key, count]) => ({ key, count }));
    }

    async countAll(): Promise<number> {
        return this.databaseService.client.session.count();
    }

    async countActive(now: Date): Promise<number> {
        return this.databaseService.client.session.count({
            where: { isRevoked: false, expiredAt: { gt: now } },
        });
    }
}
