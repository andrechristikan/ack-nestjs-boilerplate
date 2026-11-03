import { HelperNumberService } from '@common/helper/services/helper.number.service';
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
} from '@modules/user/interfaces/user.interface';
import { UserAnalyticRepository } from '@modules/user/repositories/user.analytic.repository';
import { Injectable } from '@nestjs/common';
import {
    EnumUserLoginFrom,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    Prisma,
} from '@generated/prisma-client/client';

@Injectable()
export class UserAnalyticDomain {
    constructor(
        private readonly userAnalyticRepository: UserAnalyticRepository,
        private readonly helperNumberService: HelperNumberService
    ) {}

    getCountRegistrations(startDate: Date, endDate: Date): Promise<number> {
        return this.userAnalyticRepository.countRegistrations(
            startDate,
            endDate
        );
    }

    async getChurnRate(
        startDate: Date,
        endDate: Date
    ): Promise<IAnalyticMetricRate> {
        const [deleted, total] = await Promise.all([
            this.userAnalyticRepository.countDeletedInRange(startDate, endDate),
            this.userAnalyticRepository.countAliveAt(startDate),
        ]);
        const rate = this.helperNumberService.percent(deleted, total);
        return { count: deleted, total, rate };
    }

    getCountByStatus(status: EnumUserStatus): Promise<number> {
        return this.userAnalyticRepository.countByStatus(status);
    }

    getGroupBySignUpWith(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IUserAnalyticGroupCount<EnumUserSignUpWith>[]> {
        return this.userAnalyticRepository.groupBySignUpWith(
            startDate,
            endDate
        );
    }

    getGroupBySignUpFrom(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IUserAnalyticGroupCount<EnumUserSignUpFrom>[]> {
        return this.userAnalyticRepository.groupBySignUpFrom(
            startDate,
            endDate
        );
    }

    getGroupLoginSource(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IUserAnalyticGroupCount<EnumUserLoginFrom>[]> {
        return this.userAnalyticRepository.groupLoginSource(startDate, endDate);
    }

    getGroupByStatus(): Promise<IUserAnalyticGroupCount<EnumUserStatus>[]> {
        return this.userAnalyticRepository.groupByStatus();
    }

    getGroupByCountry(): Promise<IAnalyticCountBucket[]> {
        return this.userAnalyticRepository.groupByCountry();
    }

    getGroupByRole(): Promise<IAnalyticCountBucket[]> {
        return this.userAnalyticRepository.groupByRole();
    }

    async getEmailVerificationRate(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<IAnalyticMetricRate> {
        const [verified, total] = await Promise.all([
            this.userAnalyticRepository.countVerifiedEmail(startDate, endDate),
            this.userAnalyticRepository.countSignedUp(startDate, endDate),
        ]);
        const rate = this.helperNumberService.percent(verified, total);
        return { count: verified, total, rate };
    }

    getCountPasswordExpired(now: Date): Promise<number> {
        return this.userAnalyticRepository.countPasswordExpired(now);
    }

    getCountActive(): Promise<number> {
        return this.userAnalyticRepository.countActive();
    }

    getNearLockout(
        minAttempt: number,
        limit: number
    ): Promise<IAnalyticNearLockout[]> {
        return this.userAnalyticRepository.findNearLockout(minAttempt, limit);
    }

    getCountNearLockout(minAttempt: number): Promise<number> {
        return this.userAnalyticRepository.countNearLockout(minAttempt);
    }

    getGroupPasswordAttemptBuckets(): Promise<IAnalyticCountBucket[]> {
        return this.userAnalyticRepository.groupPasswordAttemptBuckets();
    }

    getOneById(id: string): Promise<IUserAnalyticRef | null> {
        return this.userAnalyticRepository.findOneById(id);
    }

    getManyByIds(ids: string[]): Promise<IUserAnalyticRef[]> {
        return this.userAnalyticRepository.findManyByIds(ids);
    }

    getListNearLockoutOffset(
        minAttempt: number,
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePaginationReturn<IAnalyticNearLockout>> {
        return this.userAnalyticRepository.findNearLockoutOffset(
            minAttempt,
            params
        );
    }
}
