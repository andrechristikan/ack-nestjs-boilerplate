import { DatabaseService } from '@common/database/services/database.service';
import { UserAdminNearLockoutSelect } from '@modules/user/constants/user.constant';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import type { IAnalyticCountBucket } from '@modules/analytic/interfaces/analytic.interface';
import type { IAnalyticNearLockout } from '@modules/analytic/interfaces/analytic.anomaly.interface';
import type { IUserAnalyticRepository } from '@modules/user/interfaces/user.analytic-repository.interface';
import type {
    IUserAnalyticGroupCount,
    IUserAnalyticRef,
    IUserAnalyticSignUp,
    IUserNearLockout,
} from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import {
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

    async countRegisteredUntil(endDate: Date): Promise<number> {
        return this.databaseService.client.user.count({
            where: { signUpAt: { lt: endDate } },
        });
    }

    async countByStatus(status: EnumUserStatus): Promise<number> {
        return this.databaseService.client.user.count({
            where: { status, deletedAt: null },
        });
    }

    async groupBySignUpWith(
        startDate?: Date,
        endDate?: Date
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
        startDate?: Date,
        endDate?: Date
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

    async countVerifiedEmail(): Promise<number> {
        return this.databaseService.client.user.count({
            where: { deletedAt: null, isVerified: true },
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

    async findNearLockout(minAttempt: number): Promise<IAnalyticNearLockout[]> {
        return this.databaseService.client.user.findMany({
            where: {
                deletedAt: null,
                passwordAttempt: { gte: minAttempt },
            },
            select: UserAdminNearLockoutSelect,
        });
    }

    async groupPasswordAttemptBuckets(): Promise<IAnalyticCountBucket[]> {
        const users = await this.databaseService.client.user.findMany({
            where: { deletedAt: null, passwordAttempt: { gt: 0 } },
            select: { passwordAttempt: true },
        });
        const buckets = new Map<string, number>();
        for (const u of users) {
            const key = String(u.passwordAttempt);
            buckets.set(key, (buckets.get(key) ?? 0) + 1);
        }
        return [...buckets.entries()].map(([key, count]) => ({ key, count }));
    }

    async findOneById(id: string): Promise<IUserAnalyticRef | null> {
        return this.databaseService.client.user.findFirst({
            where: { id, deletedAt: null },
            select: { id: true, email: true, passwordAttempt: true },
        });
    }

    async listNearLockoutOffset(
        minAttempt: number,
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticNearLockout>> {
        const { where, ...rest } = params;
        return this.paginationService.offset<
            IUserNearLockout,
            Prisma.UserWhereInput
        >(this.databaseService.client.user, {
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

    async findSignUpsInRange(
        startDate: Date,
        endDate: Date
    ): Promise<IUserAnalyticSignUp[]> {
        return this.databaseService.client.user.findMany({
            where: {
                deletedAt: null,
                signUpAt: { gte: startDate, lt: endDate },
            },
            select: {
                id: true,
                email: true,
                signUpAt: true,
                signUpFrom: true,
            },
        });
    }
}
