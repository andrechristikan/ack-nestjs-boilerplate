import { DatabaseService } from '@common/database/services/database.service';
import { UserAdminNearLockoutSelect } from '@modules/user/constants/user.constant';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import type { IAnalyticNearLockout } from '@modules/analytic/interfaces/analytic.anomaly.interface';
import type { IUserAnalyticRepository } from '@modules/user/interfaces/user.analytic-repository.interface';
import type {
    IUserAnalyticGroupCount,
    IUserAnalyticRef,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumUserLoginFrom,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    Prisma,
} from '@generated/prisma-client/client';

@Injectable()
export class UserAnalyticRepository implements IUserAnalyticRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async countRegistrations(startDate: Date, endDate: Date): Promise<number> {
        return this.databaseService.client.user.count({
            where: {
                deletedAt: null,
                signUpAt: { gte: startDate, lt: endDate },
            },
        });
    }

    async countDeletedInRange(startDate: Date, endDate: Date): Promise<number> {
        return this.databaseService.client.user.count({
            where: { deletedAt: { gte: startDate, lt: endDate } },
        });
    }

    async countAliveAt(date: Date): Promise<number> {
        return this.databaseService.client.user.count({
            where: {
                signUpAt: { lt: date },
                OR: [{ deletedAt: null }, { deletedAt: { gte: date } }],
            },
        });
    }

    async countByStatus(status: EnumUserStatus): Promise<number> {
        return this.databaseService.client.user.count({
            where: { status, deletedAt: null },
        });
    }

    async groupBySignUpWith(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IUserAnalyticGroupCount<EnumUserSignUpWith>[]> {
        const rows = await this.databaseService.client.user.groupBy({
            by: ['signUpWith'],
            where: {
                deletedAt: null,
                ...(startDate && endDate
                    ? { signUpAt: { gte: startDate, lt: endDate } }
                    : {}),
            },
            _count: { _all: true },
        });
        return rows.map(r => ({ key: r.signUpWith, count: r._count._all }));
    }

    async groupBySignUpFrom(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IUserAnalyticGroupCount<EnumUserSignUpFrom>[]> {
        const rows = await this.databaseService.client.user.groupBy({
            by: ['signUpFrom'],
            where: {
                deletedAt: null,
                ...(startDate && endDate
                    ? { signUpAt: { gte: startDate, lt: endDate } }
                    : {}),
            },
            _count: { _all: true },
        });
        return rows.map(r => ({ key: r.signUpFrom, count: r._count._all }));
    }

    async groupLoginSource(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IUserAnalyticGroupCount<EnumUserLoginFrom>[]> {
        const rows = await this.databaseService.client.user.groupBy({
            by: ['lastLoginFrom'],
            where: {
                deletedAt: null,
                lastLoginFrom: { not: null },
                ...(startDate &&
                    endDate && {
                        lastLoginAt: { gte: startDate, lt: endDate },
                    }),
            },
            _count: { _all: true },
        });
        return rows.flatMap(row =>
            row.lastLoginFrom === null
                ? []
                : [{ key: row.lastLoginFrom, count: row._count._all }]
        );
    }

    async groupByStatus(): Promise<IUserAnalyticGroupCount<EnumUserStatus>[]> {
        const rows = await this.databaseService.client.user.groupBy({
            by: ['status'],
            where: { deletedAt: null },
            _count: { _all: true },
        });
        return rows.map(r => ({ key: r.status, count: r._count._all }));
    }

    async groupByCountry(): Promise<IAnalyticCountBucket[]> {
        const rows = await this.databaseService.client.user.groupBy({
            by: ['countryId'],
            where: { deletedAt: null },
            _count: { _all: true },
        });
        return rows.map(r => ({ key: r.countryId, count: r._count._all }));
    }

    async groupByRole(): Promise<IAnalyticCountBucket[]> {
        const rows = await this.databaseService.client.user.groupBy({
            by: ['roleId'],
            where: { deletedAt: null },
            _count: { _all: true },
        });
        return rows.map(r => ({ key: r.roleId, count: r._count._all }));
    }

    async countVerifiedEmail(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<number> {
        return this.databaseService.client.user.count({
            where: {
                deletedAt: null,
                isVerified: true,
                ...(startDate &&
                    endDate && { signUpAt: { gte: startDate, lt: endDate } }),
            },
        });
    }

    async countSignedUp(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<number> {
        return this.databaseService.client.user.count({
            where: {
                deletedAt: null,
                ...(startDate &&
                    endDate && { signUpAt: { gte: startDate, lt: endDate } }),
            },
        });
    }

    async countActive(): Promise<number> {
        return this.databaseService.client.user.count({
            where: { deletedAt: null },
        });
    }

    async countPasswordExpired(now: Date): Promise<number> {
        return this.databaseService.client.user.count({
            where: {
                deletedAt: null,
                passwordExpired: { lt: now },
            },
        });
    }

    async findNearLockout(
        minAttempt: number,
        limit: number
    ): Promise<IAnalyticNearLockout[]> {
        return this.databaseService.client.user.findMany({
            where: {
                deletedAt: null,
                passwordAttempt: { gte: minAttempt },
            },
            select: UserAdminNearLockoutSelect,
            orderBy: { passwordAttempt: EnumPaginationOrderDirectionType.desc },
            take: limit,
        });
    }

    async countNearLockout(minAttempt: number): Promise<number> {
        return this.databaseService.client.user.count({
            where: {
                deletedAt: null,
                passwordAttempt: { gte: minAttempt },
            },
        });
    }

    async groupPasswordAttemptBuckets(): Promise<IAnalyticCountBucket[]> {
        const rows = await this.databaseService.client.user.groupBy({
            by: ['passwordAttempt'],
            where: { deletedAt: null, passwordAttempt: { gt: 0 } },
            _count: { _all: true },
        });
        return rows.map(row => ({
            key: String(row.passwordAttempt),
            count: row._count._all,
        }));
    }

    async findOneById(id: string): Promise<IUserAnalyticRef | null> {
        return this.databaseService.client.user.findFirst({
            where: { id, deletedAt: null },
            select: { id: true, email: true, passwordAttempt: true },
        });
    }

    async findManyByIds(ids: string[]): Promise<IUserAnalyticRef[]> {
        return this.databaseService.client.user.findMany({
            where: { id: { in: ids }, deletedAt: null },
            select: { id: true, email: true, passwordAttempt: true },
        });
    }

    async findNearLockoutOffset(
        minAttempt: number,
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticNearLockout>> {
        const { where, ...rest } = params;
        return this.paginationService.offset(this.databaseService.client.user, {
            ...rest,
            where: {
                AND: [
                    ...(where ? [where] : []),
                    { deletedAt: null },
                    { passwordAttempt: { gte: minAttempt } },
                ],
            },
            select: UserAdminNearLockoutSelect,
        });
    }
}
