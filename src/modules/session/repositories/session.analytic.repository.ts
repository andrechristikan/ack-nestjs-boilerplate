import { DatabaseService } from '@common/database/services/database.service';
import type {
    IRequestGeoLocation,
    IRequestUserAgent,
} from '@common/request/interfaces/request.interface';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import type { ISessionAnalyticRepository } from '@modules/session/interfaces/session.analytic-repository.interface';
import type {
    ISessionAnalyticSession,
    ISessionAnalyticUserCount,
} from '@modules/session/interfaces/session.interface';
import { Prisma } from '@generated/prisma-client/client';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionAnalyticRepository implements ISessionAnalyticRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findActiveWithGeoInRange(
        startDate?: Date,
        endDate?: Date
    ): Promise<ISessionAnalyticSession[]> {
        const rows = await this.databaseService.client.session.findMany({
            where: {
                isRevoked: false,
                geoLocation: { not: Prisma.DbNull },
                ...(startDate && endDate
                    ? { createdAt: { gte: startDate, lt: endDate } }
                    : {}),
            },
            select: {
                id: true,
                userId: true,
                ipAddress: true,
                createdAt: true,
                geoLocation: true,
                userAgent: true,
            },
            orderBy: [
                { userId: EnumPaginationOrderDirectionType.asc },
                { createdAt: EnumPaginationOrderDirectionType.asc },
            ],
        });

        return rows.map(row => ({
            ...row,
            geoLocation: row.geoLocation as IRequestGeoLocation | null,
            userAgent: row.userAgent as IRequestUserAgent,
        }));
    }

    async countActiveByUser(): Promise<ISessionAnalyticUserCount[]> {
        const rows = await this.databaseService.client.session.groupBy({
            by: ['userId'],
            where: { isRevoked: false },
            _count: { _all: true },
        });
        return rows.map(r => ({ userId: r.userId, count: r._count._all }));
    }

    async groupByCountry(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticCountBucket[]> {
        const sessions = await this.findActiveWithGeoInRange(
            startDate,
            endDate
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

    async countActive(): Promise<number> {
        return this.databaseService.client.session.count({
            where: { isRevoked: false },
        });
    }
}
