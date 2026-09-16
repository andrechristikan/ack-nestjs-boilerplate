import {
    IAnalyticApiKeyActiveExpired,
    IAnalyticApiKeyLifecycle,
    IAnalyticBlockedUsers,
    IAnalyticBucketsResult,
    IAnalyticForgotPasswordConversion,
    IAnalyticLockoutMetrics,
    IAnalyticMetricCount,
    IAnalyticMetricRate,
    IAnalyticMobileChurn,
    IAnalyticPasswordExpiry,
    IAnalyticProjectCount,
    IAnalyticProjectCreation,
    IAnalyticSessionDeviceRatio,
    IAnalyticStatusCount,
    IAnalyticTermPolicyAcceptanceRate,
    IAnalyticTermPolicyTimeToAccept,
    IAnalyticTwoFactorAdoption,
    IAnalyticTwoFactorAttemptSnapshot,
    IAnalyticVerificationFunnels,
    IAnalyticWorkspaceCount,
} from '@modules/analytic/interfaces/analytic.interface';
import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import { Response } from '@common/response/decorators/response.decorator';
import { AnalyticAdminMetricDoc } from '@modules/analytic/docs/analytic.admin.doc';
import {
    AnalyticDateRangeRequestDto,
    AnalyticDateRangeRequestSchema,
} from '@modules/analytic/dtos/request/analytic.date-range.request.dto';
import {
    AnalyticOptionalDateRangeRequestDto,
    AnalyticOptionalDateRangeRequestSchema,
} from '@modules/analytic/dtos/request/analytic.optional-date-range.request.dto';
import { AnalyticJsonResponseSchema } from '@modules/analytic/dtos/response/analytic.metric.response.dto';
import { AnalyticDashboardHttpService } from '@modules/analytic/services/analytic.dashboard.http.service';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
} from '@generated/prisma-client';

@ApiTags('modules.admin.analytic')
@Controller({
    version: '1',
    path: '/analytic',
})
export class AnalyticDashboardAdminController {
    constructor(
        private readonly analyticDashboardHttpService: AnalyticDashboardHttpService
    ) {}

    @AnalyticAdminMetricDoc('usersRegistrations')
    @Response('analytic.usersRegistrations', {
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
    @Get('/users/registrations')
    async usersRegistrations(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticMetricCount> {
        return this.analyticDashboardHttpService.usersRegistrations(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('usersChurn')
    @Response('analytic.usersChurn', {
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
    @Get('/users/churn')
    async usersChurn(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticMetricRate> {
        return this.analyticDashboardHttpService.usersChurn(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('usersBlocked')
    @Response('analytic.usersBlocked', {
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
    @Get('/users/blocked')
    async usersBlocked(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticBlockedUsers> {
        return this.analyticDashboardHttpService.usersBlocked(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('usersSignUpWith')
    @Response('analytic.usersSignUpWith', {
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
    @Get('/users/sign-up-with')
    async usersSignUpWith(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardHttpService.usersSignUpWith(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('usersSignUpFrom')
    @Response('analytic.usersSignUpFrom', {
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
    @Get('/users/sign-up-from')
    async usersSignUpFrom(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardHttpService.usersSignUpFrom(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('usersEmailVerification')
    @Response('analytic.usersEmailVerification', {
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
    @Get('/users/email-verification')
    async usersEmailVerification(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IAnalyticMetricRate> {
        return this.analyticDashboardHttpService.usersEmailVerification(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('usersMobileVerification')
    @Response('analytic.usersMobileVerification', {
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
    @Get('/users/mobile-verification')
    async usersMobileVerification(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IAnalyticMetricRate> {
        return this.analyticDashboardHttpService.usersMobileVerification(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('usersStatusDistribution')
    @Response('analytic.usersStatusDistribution', {
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
    @Get('/users/status-distribution')
    async usersStatusDistribution(): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardHttpService.usersStatusDistribution();
    }

    @AnalyticAdminMetricDoc('usersCountryDistribution')
    @Response('analytic.usersCountryDistribution', {
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
    @Get('/users/country-distribution')
    async usersCountryDistribution(): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardHttpService.usersCountryDistribution();
    }

    @AnalyticAdminMetricDoc('usersRoleDistribution')
    @Response('analytic.usersRoleDistribution', {
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
    @Get('/users/role-distribution')
    async usersRoleDistribution(): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardHttpService.usersRoleDistribution();
    }

    @AnalyticAdminMetricDoc('usersSelfDelete')
    @Response('analytic.usersSelfDelete', {
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
    @Get('/users/self-delete')
    async usersSelfDelete(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticMetricCount> {
        return this.analyticDashboardHttpService.usersSelfDelete(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('usersClaimUsername')
    @Response('analytic.usersClaimUsername', {
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
    @Get('/users/claim-username')
    async usersClaimUsername(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticMetricCount> {
        return this.analyticDashboardHttpService.usersClaimUsername(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('usersMobileChurn')
    @Response('analytic.usersMobileChurn', {
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
    @Get('/users/mobile-churn')
    async usersMobileChurn(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticMobileChurn> {
        return this.analyticDashboardHttpService.usersMobileChurn(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('authLoginFrequency')
    @Response('analytic.authLoginFrequency', {
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
    @Get('/auth/login-frequency')
    async authLoginFrequency(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticMetricCount> {
        return this.analyticDashboardHttpService.authLoginFrequency(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('authLoginMethod')
    @Response('analytic.authLoginMethod', {
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
    @Get('/auth/login-method')
    async authLoginMethod(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardHttpService.authLoginMethod(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('authLoginSource')
    @Response('analytic.authLoginSource', {
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
    @Get('/auth/login-source')
    async authLoginSource(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardHttpService.authLoginSource(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('authLockout')
    @Response('analytic.authLockout', {
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
    @Get('/auth/lockout')
    async authLockout(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticLockoutMetrics> {
        return this.analyticDashboardHttpService.authLockout(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('authSessionRevoke')
    @Response('analytic.authSessionRevoke', {
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
    @Get('/auth/session-revoke')
    async authSessionRevoke(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticMetricCount> {
        return this.analyticDashboardHttpService.authSessionRevoke(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('authConcurrentSessions')
    @Response('analytic.authConcurrentSessions', {
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
    @Get('/auth/concurrent-sessions')
    async authConcurrentSessions(): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardHttpService.authConcurrentSessions();
    }

    @AnalyticAdminMetricDoc('authSessionsGeo')
    @Response('analytic.authSessionsGeo', {
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
    @Get('/auth/sessions-geo')
    async authSessionsGeo(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardHttpService.authSessionsGeo(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('authSessionsUserAgent')
    @Response('analytic.authSessionsUserAgent', {
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
    @Get('/auth/sessions-user-agent')
    async authSessionsUserAgent(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardHttpService.authSessionsUserAgent(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('authRefreshTokenVolume')
    @Response('analytic.authRefreshTokenVolume', {
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
    @Get('/auth/refresh-token-volume')
    async authRefreshTokenVolume(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticMetricCount> {
        return this.analyticDashboardHttpService.authRefreshTokenVolume(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('authLogoutRate')
    @Response('analytic.authLogoutRate', {
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
    @Get('/auth/logout-rate')
    async authLogoutRate(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticMetricCount> {
        return this.analyticDashboardHttpService.authLogoutRate(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('authVerificationFunnel')
    @Response('analytic.authVerificationFunnel', {
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
    @Get('/auth/verification-funnel')
    async authVerificationFunnel(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticVerificationFunnels> {
        return this.analyticDashboardHttpService.authVerificationFunnel(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('authPasswordExpiry')
    @Response('analytic.authPasswordExpiry', {
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
    @Get('/auth/password-expiry')
    async authPasswordExpiry(): Promise<IAnalyticPasswordExpiry> {
        return this.analyticDashboardHttpService.authPasswordExpiry();
    }

    @AnalyticAdminMetricDoc('authPasswordChange')
    @Response('analytic.authPasswordChange', {
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
    @Get('/auth/password-change')
    async authPasswordChange(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticMetricCount> {
        return this.analyticDashboardHttpService.authPasswordChange(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('authForgotPasswordConversion')
    @Response('analytic.authForgotPasswordConversion', {
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
    @Get('/auth/forgot-password-conversion')
    async authForgotPasswordConversion(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticForgotPasswordConversion> {
        return this.analyticDashboardHttpService.authForgotPasswordConversion(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('authAdminForcePassword')
    @Response('analytic.authAdminForcePassword', {
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
    @Get('/auth/admin-force-password')
    async authAdminForcePassword(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticMetricCount> {
        return this.analyticDashboardHttpService.authAdminForcePassword(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('authTwoFactorAdoption')
    @Response('analytic.authTwoFactorAdoption', {
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
    @Get('/auth/two-factor-adoption')
    async authTwoFactorAdoption(): Promise<IAnalyticTwoFactorAdoption> {
        return this.analyticDashboardHttpService.authTwoFactorAdoption();
    }

    @AnalyticAdminMetricDoc('authTwoFactorAdminReset')
    @Response('analytic.authTwoFactorAdminReset', {
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
    @Get('/auth/two-factor-admin-reset')
    async authTwoFactorAdminReset(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticMetricCount> {
        return this.analyticDashboardHttpService.authTwoFactorAdminReset(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('authTwoFactorVerifySuccess')
    @Response('analytic.authTwoFactorVerifySuccess', {
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
    @Get('/auth/two-factor-verify-success')
    async authTwoFactorVerifySuccess(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticMetricCount> {
        return this.analyticDashboardHttpService.authTwoFactorVerifySuccess(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('authBackupCodeRegen')
    @Response('analytic.authBackupCodeRegen', {
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
    @Get('/auth/backup-code-regen')
    async authBackupCodeRegen(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticMetricCount> {
        return this.analyticDashboardHttpService.authBackupCodeRegen(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('authTwoFactorAttempt')
    @Response('analytic.authTwoFactorAttempt', {
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
    @Get('/auth/two-factor-attempt')
    async authTwoFactorAttempt(): Promise<IAnalyticTwoFactorAttemptSnapshot> {
        return this.analyticDashboardHttpService.authTwoFactorAttempt();
    }

    @AnalyticAdminMetricDoc('devicesRegistration')
    @Response('analytic.devicesRegistration', {
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
    @Get('/devices/registration')
    async devicesRegistration(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticMetricCount> {
        return this.analyticDashboardHttpService.devicesRegistration(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('devicesPlatform')
    @Response('analytic.devicesPlatform', {
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
    @Get('/devices/platform')
    async devicesPlatform(): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardHttpService.devicesPlatform();
    }

    @AnalyticAdminMetricDoc('devicesPushToken')
    @Response('analytic.devicesPushToken', {
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
    @Get('/devices/push-token')
    async devicesPushToken(): Promise<IAnalyticMetricRate> {
        return this.analyticDashboardHttpService.devicesPushToken();
    }

    @AnalyticAdminMetricDoc('devicesInfoRefresh')
    @Response('analytic.devicesInfoRefresh', {
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
    @Get('/devices/info-refresh')
    async devicesInfoRefresh(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticMetricCount> {
        return this.analyticDashboardHttpService.devicesInfoRefresh(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('devicesSessionRatio')
    @Response('analytic.devicesSessionRatio', {
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
    @Get('/devices/session-ratio')
    async devicesSessionRatio(): Promise<IAnalyticSessionDeviceRatio> {
        return this.analyticDashboardHttpService.devicesSessionRatio();
    }

    @AnalyticAdminMetricDoc('devicesPerUser')
    @Response('analytic.devicesPerUser', {
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
    @Get('/devices/per-user')
    async devicesPerUser(): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardHttpService.devicesPerUser();
    }

    @AnalyticAdminMetricDoc('devicesInactivity')
    @Response('analytic.devicesInactivity', {
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
    @Get('/devices/inactivity')
    async devicesInactivity(): Promise<IAnalyticMetricCount> {
        return this.analyticDashboardHttpService.devicesInactivity();
    }

    @AnalyticAdminMetricDoc('apiKeysLifecycle')
    @Response('analytic.apiKeysLifecycle', {
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
    @Get('/api-keys/lifecycle')
    async apiKeysLifecycle(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticApiKeyLifecycle> {
        return this.analyticDashboardHttpService.apiKeysLifecycle(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('apiKeysActiveExpired')
    @Response('analytic.apiKeysActiveExpired', {
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
    @Get('/api-keys/active-expired')
    async apiKeysActiveExpired(): Promise<IAnalyticApiKeyActiveExpired> {
        return this.analyticDashboardHttpService.apiKeysActiveExpired();
    }

    @AnalyticAdminMetricDoc('apiKeysTypeMix')
    @Response('analytic.apiKeysTypeMix', {
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
    @Get('/api-keys/type-mix')
    async apiKeysTypeMix(): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardHttpService.apiKeysTypeMix();
    }

    @AnalyticAdminMetricDoc('termPoliciesAcceptanceRate')
    @Response('analytic.termPoliciesAcceptanceRate', {
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
    @Get('/term-policies/acceptance-rate')
    async termPoliciesAcceptanceRate(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IAnalyticTermPolicyAcceptanceRate> {
        return this.analyticDashboardHttpService.termPoliciesAcceptanceRate(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('termPoliciesTimeToAccept')
    @Response('analytic.termPoliciesTimeToAccept', {
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
    @Get('/term-policies/time-to-accept')
    async termPoliciesTimeToAccept(
        @Query({ schema: AnalyticOptionalDateRangeRequestSchema })
        query: AnalyticOptionalDateRangeRequestDto
    ): Promise<IAnalyticTermPolicyTimeToAccept> {
        return this.analyticDashboardHttpService.termPoliciesTimeToAccept(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('workspacesCreation')
    @Response('analytic.workspacesCreation', {
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
    @Get('/workspaces/creation')
    async workspacesCreation(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticMetricCount> {
        return this.analyticDashboardHttpService.workspacesCreation(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('workspacesVisibility')
    @Response('analytic.workspacesVisibility', {
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
    @Get('/workspaces/visibility')
    async workspacesVisibility(): Promise<IAnalyticBucketsResult> {
        return this.analyticDashboardHttpService.workspacesVisibility();
    }

    @AnalyticAdminMetricDoc('workspacesInviteFunnel')
    @Response('analytic.workspacesInviteFunnel', {
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
    @Get('/workspaces/invite-funnel')
    async workspacesInviteFunnel(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticStatusCount[]> {
        return this.analyticDashboardHttpService.workspacesInviteFunnel(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('workspacesJoinOutcomes')
    @Response('analytic.workspacesJoinOutcomes', {
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
    @Get('/workspaces/join-outcomes')
    async workspacesJoinOutcomes(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticStatusCount[]> {
        return this.analyticDashboardHttpService.workspacesJoinOutcomes(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('workspacesMembership')
    @Response('analytic.workspacesMembership', {
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
    @Get('/workspaces/membership')
    async workspacesMembership(): Promise<IAnalyticWorkspaceCount[]> {
        return this.analyticDashboardHttpService.workspacesMembership();
    }

    @AnalyticAdminMetricDoc('workspacesActivityVolume')
    @Response('analytic.workspacesActivityVolume', {
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
    @Get('/workspaces/activity-volume')
    async workspacesActivityVolume(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticWorkspaceCount[]> {
        return this.analyticDashboardHttpService.workspacesActivityVolume(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('projectsCreation')
    @Response('analytic.projectsCreation', {
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
    @Get('/projects/creation')
    async projectsCreation(
        @Query({ schema: AnalyticDateRangeRequestSchema })
        query: AnalyticDateRangeRequestDto
    ): Promise<IAnalyticProjectCreation> {
        return this.analyticDashboardHttpService.projectsCreation(
            query.startDate,
            query.endDate
        );
    }

    @AnalyticAdminMetricDoc('projectsMembership')
    @Response('analytic.projectsMembership', {
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
    @Get('/projects/membership')
    async projectsMembership(): Promise<IAnalyticProjectCount[]> {
        return this.analyticDashboardHttpService.projectsMembership();
    }
}
