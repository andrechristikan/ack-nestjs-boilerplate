import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    IAnalyticCountBucket,
    IAnalyticMetricRate,
} from '@modules/analytic/interfaces/analytic.interface';
import type { IAnalyticNearLockout } from '@modules/analytic/interfaces/analytic.anomaly.interface';
import type {
    IUserAnalyticGroupCount,
    IUserAnalyticRef,
    IUserAnalyticSignUp,
} from '@modules/user/interfaces/user.interface';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { UserAnalyticRepository } from '@modules/user/repositories/user.analytic.repository';
import { Injectable } from '@nestjs/common';
import {
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    Prisma,
} from '@generated/prisma-client/client';

@Injectable()
export class UserAnalyticDomain {
    constructor(
        private readonly userAnalyticRepository: UserAnalyticRepository,
        private readonly roleDomain: RoleDomain
    ) {}

    countRegistrations(startDate: Date, endDate: Date): Promise<number> {
        return this.userAnalyticRepository.countRegistrations(
            startDate,
            endDate
        );
    }

    async churnRate(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricRate> {
        const [deleted, total] = await Promise.all([
            this.userAnalyticRepository.countDeletedInRange(startDate, endDate),
            this.userAnalyticRepository.countRegisteredUntil(endDate),
        ]);
        return {
            count: deleted,
            total,
            rate: total === 0 ? 0 : (deleted / total) * 100,
        };
    }

    countByStatus(status: EnumUserStatus): Promise<number> {
        return this.userAnalyticRepository.countByStatus(status);
    }

    groupBySignUpWith(
        startDate?: Date,
        endDate?: Date
    ): Promise<IUserAnalyticGroupCount<EnumUserSignUpWith>[]> {
        return this.userAnalyticRepository.groupBySignUpWith(
            startDate,
            endDate
        );
    }

    groupBySignUpFrom(
        startDate?: Date,
        endDate?: Date
    ): Promise<IUserAnalyticGroupCount<EnumUserSignUpFrom>[]> {
        return this.userAnalyticRepository.groupBySignUpFrom(
            startDate,
            endDate
        );
    }

    groupByStatus(): Promise<IUserAnalyticGroupCount<EnumUserStatus>[]> {
        return this.userAnalyticRepository.groupByStatus();
    }

    groupByCountry(): Promise<IAnalyticCountBucket[]> {
        return this.userAnalyticRepository.groupByCountry();
    }

    async groupByRole(): Promise<IAnalyticCountBucket[]> {
        const rows = await this.userAnalyticRepository.groupByRole();
        const roles = await this.roleDomain.getByIds(
            rows.map(({ key }) => key)
        );
        const roleKeyById = new Map(roles.map(role => [role.id, role.key]));

        return rows.flatMap(({ key, count }) => {
            const roleKey = roleKeyById.get(key);

            return roleKey === undefined ? [] : [{ key: roleKey, count }];
        });
    }

    async emailVerificationRate(): Promise<IAnalyticMetricRate> {
        const [verified, total] = await Promise.all([
            this.userAnalyticRepository.countVerifiedEmail(),
            this.userAnalyticRepository.countActive(),
        ]);
        return {
            count: verified,
            total,
            rate: total === 0 ? 0 : (verified / total) * 100,
        };
    }

    countPasswordExpired(now: Date): Promise<number> {
        return this.userAnalyticRepository.countPasswordExpired(now);
    }

    countActive(): Promise<number> {
        return this.userAnalyticRepository.countActive();
    }

    findNearLockout(minAttempt: number): Promise<IAnalyticNearLockout[]> {
        return this.userAnalyticRepository.findNearLockout(minAttempt);
    }

    groupPasswordAttemptBuckets(): Promise<IAnalyticCountBucket[]> {
        return this.userAnalyticRepository.groupPasswordAttemptBuckets();
    }

    findOneById(id: string): Promise<IUserAnalyticRef | null> {
        return this.userAnalyticRepository.findOneById(id);
    }

    listNearLockoutOffset(
        minAttempt: number,
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticNearLockout>> {
        return this.userAnalyticRepository.listNearLockoutOffset(
            minAttempt,
            params
        );
    }

    findSignUpsInRange(
        startDate: Date,
        endDate: Date
    ): Promise<IUserAnalyticSignUp[]> {
        return this.userAnalyticRepository.findSignUpsInRange(
            startDate,
            endDate
        );
    }
}
