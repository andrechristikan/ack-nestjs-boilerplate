import { DatabaseService } from '@common/database/services/database.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import type {
    ISessionAnalyticListRow,
    ISessionAnalyticRepository,
    ISessionAnalyticSessionRow,
    ISessionAnalyticUserCount,
} from '@modules/session/interfaces/session.analytic.repository.interface';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';

@Injectable()
export class SessionAnalyticRepository implements ISessionAnalyticRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findActiveWithGeoInRange(
        startDate?: Date,
        endDate?: Date
    ): Promise<ISessionAnalyticSessionRow[]> {
        return this.databaseService.client.session.findMany({
            where: {
                isRevoked: false,
                geoLocation: { isSet: true },
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

    async listOffset(
        params: IPaginationQueryOffsetParams<Prisma.SessionWhereInput>
    ): Promise<IResponsePagingReturn<ISessionAnalyticListRow>> {
        const { where, ...rest } = params;
        return this.paginationService.offset(
            this.databaseService.client.session,
            {
                ...rest,
                where: where ?? {},
            }
        );
    }
}
