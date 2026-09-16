import {
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
import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { AnalyticDefaultAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import {
    AnalyticAdminListDoc,
    AnalyticAdminRiskScoreDoc,
    AnalyticAdminSummaryDoc,
} from '@modules/analytic/docs/analytic.admin.doc';
import {
    AnalyticDateRangeRequestDto,
    AnalyticDateRangeRequestSchema,
} from '@modules/analytic/dtos/request/analytic.date-range.request.dto';
import {
    AnalyticFraudRiskScoresRequestDto,
    AnalyticFraudRiskScoresRequestSchema,
} from '@modules/analytic/dtos/request/analytic.fraud-risk-scores.request.dto';
import {
    AnalyticWindowRequestDto,
    AnalyticWindowRequestSchema,
} from '@modules/analytic/dtos/request/analytic.window.request.dto';
import {
    AnalyticFraudRiskScoreResponseSchema,
    AnalyticJsonResponseSchema,
    AnalyticSummaryResponseSchema,
} from '@modules/analytic/dtos/response/analytic.metric.response.dto';
import { AnalyticFraudHttpService } from '@modules/analytic/services/analytic.fraud.http.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    Prisma,
} from '@generated/prisma-client';

@ApiTags('modules.admin.analytic.fraud')
@Controller({
    version: '1',
    path: '/analytic/fraud',
})
export class AnalyticFraudAdminController {
    constructor(
        private readonly analyticFraudHttpService: AnalyticFraudHttpService
    ) {}

    @AnalyticAdminSummaryDoc('credential-stuffing fraud summary')
    @Response('analytic.fraudCredentialStuffing', {
        schema: AnalyticSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/credential-stuffing')
    async credentialStuffing(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IAnalyticFraudSummary> {
        return this.analyticFraudHttpService.credentialStuffingSummary(
            query.windowMs
        );
    }

    @AnalyticAdminListDoc('credential-stuffing fraud list')
    @ResponsePaging('analytic.fraudCredentialStuffingList', {
        schema: AnalyticJsonResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/credential-stuffing/list')
    async credentialStuffingList(
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>,
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticCredentialStuffingRow>> {
        return this.analyticFraudHttpService.credentialStuffingList(
            query.windowMs,
            pagination
        );
    }

    @AnalyticAdminSummaryDoc('account-takeover fraud summary')
    @Response('analytic.fraudAccountTakeover', {
        schema: AnalyticSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/account-takeover')
    async accountTakeover(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticFraudSummary> {
        return this.analyticFraudHttpService.accountTakeoverSummary(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminListDoc('account-takeover fraud list')
    @ResponsePaging('analytic.fraudAccountTakeoverList', {
        schema: AnalyticJsonResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/account-takeover/list')
    async accountTakeoverList(
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.PasswordHistoryWhereInput>,
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticAccountTakeoverRow>> {
        return this.analyticFraudHttpService.accountTakeoverList(
            query.startDate,
            query.endDate,
            pagination
        );
    }

    @AnalyticAdminSummaryDoc('mass-registration fraud summary')
    @Response('analytic.fraudMassRegistration', {
        schema: AnalyticSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/mass-registration')
    async massRegistration(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IAnalyticFraudSummary> {
        return this.analyticFraudHttpService.massRegistrationSummary(
            query.windowMs
        );
    }

    @AnalyticAdminListDoc('mass-registration fraud list')
    @ResponsePaging('analytic.fraudMassRegistrationList', {
        schema: AnalyticJsonResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/mass-registration/list')
    async massRegistrationList(
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>,
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticMassRegistrationRow>> {
        return this.analyticFraudHttpService.massRegistrationList(
            query.windowMs,
            pagination
        );
    }

    @AnalyticAdminSummaryDoc('password-reset-enumeration fraud summary')
    @Response('analytic.fraudPasswordResetEnumeration', {
        schema: AnalyticSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/password-reset-enumeration')
    async passwordResetEnumeration(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IAnalyticFraudSummary> {
        return this.analyticFraudHttpService.passwordResetEnumerationSummary(
            query.windowMs
        );
    }

    @AnalyticAdminListDoc('password-reset-enumeration fraud list')
    @ResponsePaging('analytic.fraudPasswordResetEnumerationList', {
        schema: AnalyticJsonResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/password-reset-enumeration/list')
    async passwordResetEnumerationList(
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ForgotPasswordWhereInput>,
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticPasswordResetEnumerationRow>> {
        return this.analyticFraudHttpService.passwordResetEnumerationList(
            query.windowMs,
            pagination
        );
    }

    @AnalyticAdminSummaryDoc('shared-fingerprint fraud summary')
    @Response('analytic.fraudSharedFingerprint', {
        schema: AnalyticSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/shared-fingerprint')
    async sharedFingerprint(): Promise<IAnalyticFraudSummary> {
        return this.analyticFraudHttpService.sharedFingerprintSummary();
    }

    @AnalyticAdminListDoc('shared-fingerprint fraud list')
    @ResponsePaging('analytic.fraudSharedFingerprintList', {
        schema: AnalyticJsonResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/shared-fingerprint/list')
    async sharedFingerprintList(
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.DeviceOwnershipWhereInput>
    ): Promise<IResponsePagingReturn<IAnalyticSharedFingerprintRow>> {
        return this.analyticFraudHttpService.sharedFingerprintList(pagination);
    }

    @AnalyticAdminSummaryDoc('session-after-admin fraud summary')
    @Response('analytic.fraudSessionAfterAdmin', {
        schema: AnalyticSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/session-after-admin')
    async sessionAfterAdmin(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticFraudSummary> {
        return this.analyticFraudHttpService.sessionAfterAdminSummary(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminListDoc('session-after-admin fraud list')
    @ResponsePaging('analytic.fraudSessionAfterAdminList', {
        schema: AnalyticJsonResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/session-after-admin/list')
    async sessionAfterAdminList(
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>,
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticSessionAfterAdminRow>> {
        return this.analyticFraudHttpService.sessionAfterAdminList(
            query.startDate,
            query.endDate,
            pagination
        );
    }

    @AnalyticAdminSummaryDoc('forgot-password-token-abuse fraud summary')
    @Response('analytic.fraudForgotPasswordTokenAbuse', {
        schema: AnalyticSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/forgot-password-token-abuse')
    async forgotPasswordTokenAbuse(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IAnalyticFraudSummary> {
        return this.analyticFraudHttpService.forgotPasswordTokenAbuseSummary(
            query.windowMs
        );
    }

    @AnalyticAdminListDoc('forgot-password-token-abuse fraud list')
    @ResponsePaging('analytic.fraudForgotPasswordTokenAbuseList', {
        schema: AnalyticJsonResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/forgot-password-token-abuse/list')
    async forgotPasswordTokenAbuseList(
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ForgotPasswordWhereInput>,
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticForgotPasswordAbuseRow>> {
        return this.analyticFraudHttpService.forgotPasswordTokenAbuseList(
            query.windowMs,
            pagination
        );
    }

    @AnalyticAdminSummaryDoc('refresh-spike fraud summary')
    @Response('analytic.fraudRefreshSpike', {
        schema: AnalyticSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/refresh-spike')
    async refreshSpike(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IAnalyticFraudSummary> {
        return this.analyticFraudHttpService.refreshSpikeSummary(
            query.windowMs
        );
    }

    @AnalyticAdminListDoc('refresh-spike fraud list')
    @ResponsePaging('analytic.fraudRefreshSpikeList', {
        schema: AnalyticJsonResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/refresh-spike/list')
    async refreshSpikeList(
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>,
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticRefreshSpikeRow>> {
        return this.analyticFraudHttpService.refreshSpikeList(
            query.windowMs,
            pagination
        );
    }

    @AnalyticAdminSummaryDoc('backup-code-new-device fraud summary')
    @Response('analytic.fraudBackupCodeNewDevice', {
        schema: AnalyticSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/backup-code-new-device')
    async backupCodeNewDevice(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IAnalyticFraudSummary> {
        return this.analyticFraudHttpService.backupCodeNewDeviceSummary(
            query.windowMs
        );
    }

    @AnalyticAdminListDoc('backup-code-new-device fraud list')
    @ResponsePaging('analytic.fraudBackupCodeNewDeviceList', {
        schema: AnalyticJsonResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/backup-code-new-device/list')
    async backupCodeNewDeviceList(
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>,
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticBackupCodeNewDeviceRow>> {
        return this.analyticFraudHttpService.backupCodeNewDeviceList(
            query.windowMs,
            pagination
        );
    }

    @AnalyticAdminSummaryDoc('api-key-burst fraud summary')
    @Response('analytic.fraudApiKeyBurst', {
        schema: AnalyticSummaryResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/api-key-burst')
    async apiKeyBurst(
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IAnalyticFraudSummary> {
        return this.analyticFraudHttpService.apiKeyBurstSummary(query.windowMs);
    }

    @AnalyticAdminListDoc('api-key-burst fraud list')
    @ResponsePaging('analytic.fraudApiKeyBurstList', {
        schema: AnalyticJsonResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/api-key-burst/list')
    async apiKeyBurstList(
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ActivityLogWhereInput>,
        @Query({ schema: AnalyticWindowRequestSchema })
        query: AnalyticWindowRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticApiKeyBurstRow>> {
        return this.analyticFraudHttpService.apiKeyBurstList(
            query.windowMs,
            pagination
        );
    }

    @AnalyticAdminRiskScoreDoc()
    @Response('analytic.fraudRiskScore', {
        schema: AnalyticFraudRiskScoreResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/risk-score/:userId')
    async riskScore(
        @Param('userId', { schema: RequestUuidSchema })
        userId: string
    ): Promise<IAnalyticFraudRiskScore> {
        return this.analyticFraudHttpService.riskScore(userId);
    }

    @AnalyticAdminListDoc('fraud risk scores queue')
    @ResponsePaging('analytic.fraudRiskScores', {
        schema: AnalyticFraudRiskScoreResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.analytic,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/risk-scores')
    async riskScores(
        @PaginationOffsetQuery({
            availableOrderBy: AnalyticDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput>,
        @Query({ schema: AnalyticFraudRiskScoresRequestSchema })
        query: AnalyticFraudRiskScoresRequestDto
    ): Promise<IResponsePagingReturn<IAnalyticFraudRiskScore>> {
        return this.analyticFraudHttpService.riskScores(
            query.minScore,
            pagination
        );
    }
}
