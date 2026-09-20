import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
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
import { Prisma } from '@generated/prisma-client/client';

@Injectable()
export class AnalyticFraudHttpService {
    constructor(
        private readonly analyticFraudDomain: AnalyticFraudDomain,
        private readonly analyticDateDomain: AnalyticDateDomain
    ) {}

    async credentialStuffingSummary(
        windowMs?: number
    ): Promise<IResponseReturn<IAnalyticFraudSummary>> {
        const data = await this.analyticFraudDomain.credentialStuffingSummary(
            windowMs ?? null
        );

        return { data };
    }

    credentialStuffingList(
        windowMs: number | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticCredentialStuffing>> {
        return this.analyticFraudDomain.credentialStuffingList(
            windowMs ?? null,
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

    accountTakeoverList(
        startDate: Date | undefined,
        endDate: Date | undefined,
        params: IPaginationQueryOffsetParams<Prisma.PasswordHistoryWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticAccountTakeover>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
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

    massRegistrationList(
        windowMs: number | undefined,
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticMassRegistration>> {
        return this.analyticFraudDomain.massRegistrationList(
            windowMs ?? null,
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

    passwordResetEnumerationList(
        windowMs: number | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ForgotPasswordWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticPasswordResetEnumeration>> {
        return this.analyticFraudDomain.passwordResetEnumerationList(
            windowMs ?? null,
            params
        );
    }

    async sharedFingerprintSummary(): Promise<
        IResponseReturn<IAnalyticFraudSummary>
    > {
        const data = await this.analyticFraudDomain.sharedFingerprintSummary();

        return { data };
    }

    sharedFingerprintList(
        params: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticSharedFingerprint>> {
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

    sessionAfterAdminList(
        startDate: Date | undefined,
        endDate: Date | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticSessionAfterAdmin>> {
        const range = this.analyticDateDomain.requireRange(
            startDate ?? null,
            endDate ?? null
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

    forgotPasswordTokenAbuseList(
        windowMs: number | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ForgotPasswordWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticForgotPasswordAbuse>> {
        return this.analyticFraudDomain.forgotPasswordTokenAbuseList(
            windowMs ?? null,
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

    refreshSpikeList(
        windowMs: number | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticRefreshSpike>> {
        return this.analyticFraudDomain.refreshSpikeList(
            windowMs ?? null,
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

    backupCodeNewDeviceList(
        windowMs: number | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticBackupCodeNewDevice>> {
        return this.analyticFraudDomain.backupCodeNewDeviceList(
            windowMs ?? null,
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

    apiKeyBurstList(
        windowMs: number | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticApiKeyBurst>> {
        return this.analyticFraudDomain.apiKeyBurstList(
            windowMs ?? null,
            params
        );
    }

    async riskScore(
        userId: string
    ): Promise<IResponseReturn<IAnalyticFraudRiskScore>> {
        const data = await this.analyticFraudDomain.riskScore(userId);

        return { data };
    }

    riskScores(
        minScore: number | undefined,
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticFraudRiskScore>> {
        return this.analyticFraudDomain.riskScores(minScore ?? null, params);
    }
}
