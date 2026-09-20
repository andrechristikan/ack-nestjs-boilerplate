import { Prisma } from '@generated/prisma-client/client';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    AnalyticAccountTakeoverAvailableOrderBy,
    AnalyticBackupCodeNewDeviceAvailableOrderBy,
    AnalyticCredentialStuffingAvailableOrderBy,
    AnalyticForgotPasswordAbuseAvailableOrderBy,
    AnalyticFraudRiskScoreAvailableOrderBy,
    AnalyticKeyCountAvailableOrderBy,
    AnalyticSessionAfterAdminAvailableOrderBy,
    AnalyticSharedFingerprintAvailableOrderBy,
    AnalyticUserCountAvailableOrderBy,
} from '@modules/analytic/constants/analytic.list.constant';
import type { AnalyticAccountTakeoverListRequestDto } from '@modules/analytic/dtos/request/analytic-account-takeover-list.request.dto';
import type { AnalyticApiKeyBurstListRequestDto } from '@modules/analytic/dtos/request/analytic-api-key-burst-list.request.dto';
import type { AnalyticBackupCodeNewDeviceListRequestDto } from '@modules/analytic/dtos/request/analytic-backup-code-new-device-list.request.dto';
import type { AnalyticCredentialStuffingListRequestDto } from '@modules/analytic/dtos/request/analytic-credential-stuffing-list.request.dto';
import type { AnalyticForgotPasswordAbuseListRequestDto } from '@modules/analytic/dtos/request/analytic-forgot-password-abuse-list.request.dto';
import type { AnalyticFraudRiskScoresListRequestDto } from '@modules/analytic/dtos/request/analytic-fraud-risk-scores-list.request.dto';
import type { AnalyticMassRegistrationListRequestDto } from '@modules/analytic/dtos/request/analytic-mass-registration-list.request.dto';
import type { AnalyticPasswordResetEnumerationListRequestDto } from '@modules/analytic/dtos/request/analytic-password-reset-enumeration-list.request.dto';
import type { AnalyticRefreshSpikeListRequestDto } from '@modules/analytic/dtos/request/analytic-refresh-spike-list.request.dto';
import type { AnalyticSessionAfterAdminListRequestDto } from '@modules/analytic/dtos/request/analytic-session-after-admin-list.request.dto';
import type { AnalyticSharedFingerprintListRequestDto } from '@modules/analytic/dtos/request/analytic-shared-fingerprint-list.request.dto';
import { AnalyticFraudDomain } from '@modules/analytic/domains/analytic.fraud.domain';
import type {
    IAnalyticAccountTakeover,
    IAnalyticApiKeyBurst,
    IAnalyticBackupCodeNewDevice,
    IAnalyticCredentialStuffing,
    IAnalyticForgotPasswordAbuse,
    IAnalyticFraudRiskScore,
    IAnalyticFraudSummary,
    IAnalyticMassRegistration,
    IAnalyticPasswordResetEnumeration,
    IAnalyticRefreshSpike,
    IAnalyticSessionAfterAdmin,
    IAnalyticSharedFingerprint,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateDomain } from '@modules/analytic/domains/analytic.date.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticFraudHttpService {
    constructor(
        private readonly analyticFraudDomain: AnalyticFraudDomain,
        private readonly analyticDateDomain: AnalyticDateDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async credentialStuffingSummary(
        windowMs?: number
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        const data = await this.analyticFraudDomain.credentialStuffingSummary(
            windowMs ?? null
        );

        return { data };
    }

    async credentialStuffingList(
        query: AnalyticCredentialStuffingListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticCredentialStuffing>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ActivityLogWhereInput>(
                query,
                {
                    availableOrderBy:
                        AnalyticCredentialStuffingAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticFraudDomain.credentialStuffingList(
            (query.windowMs as number | undefined) ?? null,
            params
        );
    }

    async accountTakeoverSummary(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticFraudDomain.accountTakeoverSummary(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async accountTakeoverList(
        query: AnalyticAccountTakeoverListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticAccountTakeover>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.PasswordHistoryWhereInput>(
                query,
                {
                    availableOrderBy: AnalyticAccountTakeoverAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);
        const range = this.analyticDateDomain.requireRange(
            (query.startDate as Date | undefined) ?? null,
            (query.endDate as Date | undefined) ?? null
        );
        return this.analyticFraudDomain.accountTakeoverList(
            range.startDate,
            range.endDate,
            params
        );
    }

    async massRegistrationSummary(
        windowMs?: number
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        const data = await this.analyticFraudDomain.massRegistrationSummary(
            windowMs ?? null
        );

        return { data };
    }

    async massRegistrationList(
        query: AnalyticMassRegistrationListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticMassRegistration>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.UserWhereInput>(query, {
                availableOrderBy: AnalyticKeyCountAvailableOrderBy,
            });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticFraudDomain.massRegistrationList(
            (query.windowMs as number | undefined) ?? null,
            params
        );
    }

    async passwordResetEnumerationSummary(
        windowMs?: number
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        const data =
            await this.analyticFraudDomain.passwordResetEnumerationSummary(
                windowMs ?? null
            );

        return { data };
    }

    async passwordResetEnumerationList(
        query: AnalyticPasswordResetEnumerationListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticPasswordResetEnumeration>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ForgotPasswordWhereInput>(
                query,
                {
                    availableOrderBy: AnalyticKeyCountAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticFraudDomain.passwordResetEnumerationList(
            (query.windowMs as number | undefined) ?? null,
            params
        );
    }

    async sharedFingerprintSummary(): Promise<
        IResponseReturn<IAnalyticFraudSummary>
    > {
        const data = await this.analyticFraudDomain.sharedFingerprintSummary();

        return { data };
    }

    async sharedFingerprintList(
        query: AnalyticSharedFingerprintListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticSharedFingerprint>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.DeviceOwnershipWhereInput>(
                query,
                {
                    availableOrderBy: AnalyticSharedFingerprintAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticFraudDomain.sharedFingerprintList(params);
    }

    async sessionAfterAdminSummary(
        startDate?: Date,
        endDate?: Date
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
        );
        const data = await this.analyticFraudDomain.sessionAfterAdminSummary(
            range.startDate,
            range.endDate
        );

        return { data };
    }

    async sessionAfterAdminList(
        query: AnalyticSessionAfterAdminListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticSessionAfterAdmin>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ActivityLogWhereInput>(
                query,
                {
                    availableOrderBy: AnalyticSessionAfterAdminAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);
        const range = this.analyticDateDomain.requireRange(
            (query.startDate as Date | undefined) ?? null,
            (query.endDate as Date | undefined) ?? null
        );
        return this.analyticFraudDomain.sessionAfterAdminList(
            range.startDate,
            range.endDate,
            params
        );
    }

    async forgotPasswordTokenAbuseSummary(
        windowMs?: number
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        const data =
            await this.analyticFraudDomain.forgotPasswordTokenAbuseSummary(
                windowMs ?? null
            );

        return { data };
    }

    async forgotPasswordTokenAbuseList(
        query: AnalyticForgotPasswordAbuseListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticForgotPasswordAbuse>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ForgotPasswordWhereInput>(
                query,
                {
                    availableOrderBy:
                        AnalyticForgotPasswordAbuseAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticFraudDomain.forgotPasswordTokenAbuseList(
            (query.windowMs as number | undefined) ?? null,
            params
        );
    }

    async refreshSpikeSummary(
        windowMs?: number
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        const data = await this.analyticFraudDomain.refreshSpikeSummary(
            windowMs ?? null
        );

        return { data };
    }

    async refreshSpikeList(
        query: AnalyticRefreshSpikeListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticRefreshSpike>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ActivityLogWhereInput>(
                query,
                {
                    availableOrderBy: AnalyticUserCountAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticFraudDomain.refreshSpikeList(
            (query.windowMs as number | undefined) ?? null,
            params
        );
    }

    async backupCodeNewDeviceSummary(
        windowMs?: number
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        const data = await this.analyticFraudDomain.backupCodeNewDeviceSummary(
            windowMs ?? null
        );

        return { data };
    }

    async backupCodeNewDeviceList(
        query: AnalyticBackupCodeNewDeviceListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticBackupCodeNewDevice>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ActivityLogWhereInput>(
                query,
                {
                    availableOrderBy:
                        AnalyticBackupCodeNewDeviceAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticFraudDomain.backupCodeNewDeviceList(
            (query.windowMs as number | undefined) ?? null,
            params
        );
    }

    async apiKeyBurstSummary(
        windowMs?: number
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        const data = await this.analyticFraudDomain.apiKeyBurstSummary(
            windowMs ?? null
        );

        return { data };
    }

    async apiKeyBurstList(
        query: AnalyticApiKeyBurstListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticApiKeyBurst>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ActivityLogWhereInput>(
                query,
                {
                    availableOrderBy: AnalyticUserCountAvailableOrderBy,
                }
            );
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticFraudDomain.apiKeyBurstList(
            (query.windowMs as number | undefined) ?? null,
            params
        );
    }

    async riskScore(
        userId: string
    ): Promise<IResponseReturn<IAnalyticFraudRiskScore>> {
        const data = await this.analyticFraudDomain.riskScore(userId);

        return { data };
    }

    async riskScores(
        query: AnalyticFraudRiskScoresListRequestDto
    ): Promise<IResponsePaginationReturn<IAnalyticFraudRiskScore>> {
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.UserWhereInput>(query, {
                availableOrderBy: AnalyticFraudRiskScoreAvailableOrderBy,
            });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        return this.analyticFraudDomain.riskScores(
            (query.minScore as number | undefined) ?? null,
            params
        );
    }
}
