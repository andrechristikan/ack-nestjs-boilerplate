import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { AnalyticFraudDomain } from '@modules/analytic/domains/analytic.fraud.domain';
import type {
    IAnalyticAccountTakeoverRow,
    IAnalyticApiKeyBurstRow,
    IAnalyticBackupCodeNewDeviceRow,
    IAnalyticCredentialStuffingRow,
    IAnalyticForgotPasswordAbuseRow,
    IAnalyticFraudRiskScore,
    IAnalyticFraudSummary,
    IAnalyticMassRegistrationRow,
    IAnalyticPasswordResetEnumerationRow,
    IAnalyticRefreshSpikeRow,
    IAnalyticSessionAfterAdminRow,
    IAnalyticSharedFingerprintRow,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticDateUtil } from '@modules/analytic/utils/analytic.date.util';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';

@Injectable()
export class AnalyticFraudHttpService {
    constructor(
        private readonly analyticFraudDomain: AnalyticFraudDomain,
        private readonly analyticDateUtil: AnalyticDateUtil
    ) {}

    credentialStuffingSummary(
        windowMs?: number
    ): Promise<IAnalyticFraudSummary> {
        return this.analyticFraudDomain.credentialStuffingSummary(
            windowMs ?? null
        );
    }

    credentialStuffingList(
        windowMs: number | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticCredentialStuffingRow>> {
        return this.analyticFraudDomain.credentialStuffingList(
            windowMs ?? null,
            params
        );
    }

    accountTakeoverSummary(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticFraudSummary> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticFraudDomain.accountTakeoverSummary(
            range.startDate,
            range.endDate
        );
    }

    accountTakeoverList(
        startDate: Date | undefined,
        endDate: Date | undefined,
        params: IPaginationQueryOffsetParams<Prisma.PasswordHistoryWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticAccountTakeoverRow>> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticFraudDomain.accountTakeoverList(
            range.startDate,
            range.endDate,
            params
        );
    }

    massRegistrationSummary(windowMs?: number): Promise<IAnalyticFraudSummary> {
        return this.analyticFraudDomain.massRegistrationSummary(
            windowMs ?? null
        );
    }

    massRegistrationList(
        windowMs: number | undefined,
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticMassRegistrationRow>> {
        return this.analyticFraudDomain.massRegistrationList(
            windowMs ?? null,
            params
        );
    }

    passwordResetEnumerationSummary(
        windowMs?: number
    ): Promise<IAnalyticFraudSummary> {
        return this.analyticFraudDomain.passwordResetEnumerationSummary(
            windowMs ?? null
        );
    }

    passwordResetEnumerationList(
        windowMs: number | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ForgotPasswordWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticPasswordResetEnumerationRow>> {
        return this.analyticFraudDomain.passwordResetEnumerationList(
            windowMs ?? null,
            params
        );
    }

    sharedFingerprintSummary(): Promise<IAnalyticFraudSummary> {
        return this.analyticFraudDomain.sharedFingerprintSummary();
    }

    sharedFingerprintList(
        params: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticSharedFingerprintRow>> {
        return this.analyticFraudDomain.sharedFingerprintList(params);
    }

    sessionAfterAdminSummary(
        startDate?: Date,
        endDate?: Date
    ): Promise<IAnalyticFraudSummary> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticFraudDomain.sessionAfterAdminSummary(
            range.startDate,
            range.endDate
        );
    }

    sessionAfterAdminList(
        startDate: Date | undefined,
        endDate: Date | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticSessionAfterAdminRow>> {
        const range = this.analyticDateUtil.requireRange(startDate, endDate);
        return this.analyticFraudDomain.sessionAfterAdminList(
            range.startDate,
            range.endDate,
            params
        );
    }

    forgotPasswordTokenAbuseSummary(
        windowMs?: number
    ): Promise<IAnalyticFraudSummary> {
        return this.analyticFraudDomain.forgotPasswordTokenAbuseSummary(
            windowMs ?? null
        );
    }

    forgotPasswordTokenAbuseList(
        windowMs: number | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ForgotPasswordWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticForgotPasswordAbuseRow>> {
        return this.analyticFraudDomain.forgotPasswordTokenAbuseList(
            windowMs ?? null,
            params
        );
    }

    refreshSpikeSummary(windowMs?: number): Promise<IAnalyticFraudSummary> {
        return this.analyticFraudDomain.refreshSpikeSummary(windowMs ?? null);
    }

    refreshSpikeList(
        windowMs: number | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticRefreshSpikeRow>> {
        return this.analyticFraudDomain.refreshSpikeList(
            windowMs ?? null,
            params
        );
    }

    backupCodeNewDeviceSummary(
        windowMs?: number
    ): Promise<IAnalyticFraudSummary> {
        return this.analyticFraudDomain.backupCodeNewDeviceSummary(
            windowMs ?? null
        );
    }

    backupCodeNewDeviceList(
        windowMs: number | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticBackupCodeNewDeviceRow>> {
        return this.analyticFraudDomain.backupCodeNewDeviceList(
            windowMs ?? null,
            params
        );
    }

    apiKeyBurstSummary(windowMs?: number): Promise<IAnalyticFraudSummary> {
        return this.analyticFraudDomain.apiKeyBurstSummary(windowMs ?? null);
    }

    apiKeyBurstList(
        windowMs: number | undefined,
        params: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticApiKeyBurstRow>> {
        return this.analyticFraudDomain.apiKeyBurstList(
            windowMs ?? null,
            params
        );
    }

    riskScore(userId: string): Promise<IAnalyticFraudRiskScore> {
        return this.analyticFraudDomain.riskScore(userId);
    }

    riskScores(
        minScore: number | undefined,
        params: IPaginationQueryOffsetParams<Prisma.UserWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticFraudRiskScore>> {
        return this.analyticFraudDomain.riskScores(minScore ?? null, params);
    }
}
