import {
    Doc,
    DocAuth,
    DocGuard,
    DocResponse,
    DocResponsePagination,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import {
    AnalyticAccountTakeoverAvailableOrderBy,
    AnalyticBackupCodeNewDeviceAvailableOrderBy,
    AnalyticCredentialStuffingAvailableOrderBy,
    AnalyticDeviceProliferationAvailableOrderBy,
    AnalyticForgotPasswordAbuseAvailableOrderBy,
    AnalyticFraudRiskScoreAvailableOrderBy,
    AnalyticImpossibleTravelAvailableOrderBy,
    AnalyticKeyCountAvailableOrderBy,
    AnalyticLoginSpikeIpAvailableOrderBy,
    AnalyticLoginTimeAnomalyAvailableOrderBy,
    AnalyticNearLockoutAvailableOrderBy,
    AnalyticSessionAfterAdminAvailableOrderBy,
    AnalyticSharedFingerprintAvailableOrderBy,
    AnalyticUserCountAvailableOrderBy,
} from '@modules/analytic/constants/analytic.list.constant';
import { AnalyticAccountTakeoverResponseSchema } from '@modules/analytic/dtos/response/analytic.account-takeover.response.dto';
import { AnalyticAnomalySummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.anomaly-summary.response.dto';
import { AnalyticApiKeyActiveExpiredResponseSchema } from '@modules/analytic/dtos/response/analytic.api-key-active-expired.response.dto';
import { AnalyticApiKeyLifecycleResponseSchema } from '@modules/analytic/dtos/response/analytic.api-key-lifecycle.response.dto';
import { AnalyticBackupCodeNewDeviceResponseSchema } from '@modules/analytic/dtos/response/analytic.backup-code-new-device.response.dto';
import { AnalyticBlockedUsersResponseSchema } from '@modules/analytic/dtos/response/analytic.blocked-users.response.dto';
import { AnalyticBucketsResponseSchema } from '@modules/analytic/dtos/response/analytic.buckets.response.dto';
import { AnalyticCredentialStuffingResponseSchema } from '@modules/analytic/dtos/response/analytic.credential-stuffing.response.dto';
import { AnalyticDeviceProliferationResponseSchema } from '@modules/analytic/dtos/response/analytic.device-proliferation.response.dto';
import { AnalyticForgotPasswordAbuseResponseSchema } from '@modules/analytic/dtos/response/analytic.forgot-password-abuse.response.dto';
import { AnalyticForgotPasswordConversionResponseSchema } from '@modules/analytic/dtos/response/analytic.forgot-password-conversion.response.dto';
import { AnalyticFraudRiskScoreResponseSchema } from '@modules/analytic/dtos/response/analytic.fraud-risk-score.response.dto';
import { AnalyticFraudSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.fraud-summary.response.dto';
import { AnalyticImpossibleTravelResponseSchema } from '@modules/analytic/dtos/response/analytic.impossible-travel.response.dto';
import { AnalyticKeyCountResponseSchema } from '@modules/analytic/dtos/response/analytic.key-count.response.dto';
import { AnalyticLockoutResponseSchema } from '@modules/analytic/dtos/response/analytic.lockout.response.dto';
import { AnalyticLoginSpikeIpResponseSchema } from '@modules/analytic/dtos/response/analytic.login-spike-ip.response.dto';
import { AnalyticLoginTimeAnomalyResponseSchema } from '@modules/analytic/dtos/response/analytic.login-time-anomaly.response.dto';
import { AnalyticMetricCountResponseSchema } from '@modules/analytic/dtos/response/analytic.metric-count.response.dto';
import { AnalyticMetricRateResponseSchema } from '@modules/analytic/dtos/response/analytic.metric-rate.response.dto';
import { AnalyticMobileChurnResponseSchema } from '@modules/analytic/dtos/response/analytic.mobile-churn.response.dto';
import { AnalyticNearLockoutResponseSchema } from '@modules/analytic/dtos/response/analytic.near-lockout.response.dto';
import { AnalyticPasswordExpiryResponseSchema } from '@modules/analytic/dtos/response/analytic.password-expiry.response.dto';
import { AnalyticProjectCountResponseSchema } from '@modules/analytic/dtos/response/analytic.project-count.response.dto';
import { AnalyticProjectCreationResponseSchema } from '@modules/analytic/dtos/response/analytic.project-creation.response.dto';
import { AnalyticSessionAfterAdminResponseSchema } from '@modules/analytic/dtos/response/analytic.session-after-admin.response.dto';
import { AnalyticSessionDeviceRatioResponseSchema } from '@modules/analytic/dtos/response/analytic.session-device-ratio.response.dto';
import { AnalyticSharedFingerprintResponseSchema } from '@modules/analytic/dtos/response/analytic.shared-fingerprint.response.dto';
import { AnalyticStatusCountResponseSchema } from '@modules/analytic/dtos/response/analytic.status-count.response.dto';
import { AnalyticTermPolicyAcceptanceRateResponseSchema } from '@modules/analytic/dtos/response/analytic.term-policy-acceptance-rate.response.dto';
import { AnalyticTermPolicyTimeToAcceptResponseSchema } from '@modules/analytic/dtos/response/analytic.term-policy-time-to-accept.response.dto';
import { AnalyticTwoFactorAdoptionResponseSchema } from '@modules/analytic/dtos/response/analytic.two-factor-adoption.response.dto';
import { AnalyticTwoFactorAttemptResponseSchema } from '@modules/analytic/dtos/response/analytic.two-factor-attempt.response.dto';
import { AnalyticUserCountResponseSchema } from '@modules/analytic/dtos/response/analytic.user-count.response.dto';
import { AnalyticVerificationFunnelResponseSchema } from '@modules/analytic/dtos/response/analytic.verification-funnel.response.dto';
import { AnalyticWorkspaceCountResponseSchema } from '@modules/analytic/dtos/response/analytic.workspace-count.response.dto';
import type { AnalyticAccountTakeoverResponseDto } from '@modules/analytic/dtos/response/analytic.account-takeover.response.dto';
import type { AnalyticAnomalySummaryResponseDto } from '@modules/analytic/dtos/response/analytic.anomaly-summary.response.dto';
import type { AnalyticApiKeyActiveExpiredResponseDto } from '@modules/analytic/dtos/response/analytic.api-key-active-expired.response.dto';
import type { AnalyticApiKeyLifecycleResponseDto } from '@modules/analytic/dtos/response/analytic.api-key-lifecycle.response.dto';
import type { AnalyticBackupCodeNewDeviceResponseDto } from '@modules/analytic/dtos/response/analytic.backup-code-new-device.response.dto';
import type { AnalyticBlockedUsersResponseDto } from '@modules/analytic/dtos/response/analytic.blocked-users.response.dto';
import type { AnalyticBucketsResponseDto } from '@modules/analytic/dtos/response/analytic.buckets.response.dto';
import type { AnalyticCredentialStuffingResponseDto } from '@modules/analytic/dtos/response/analytic.credential-stuffing.response.dto';
import type { AnalyticDeviceProliferationResponseDto } from '@modules/analytic/dtos/response/analytic.device-proliferation.response.dto';
import type { AnalyticForgotPasswordAbuseResponseDto } from '@modules/analytic/dtos/response/analytic.forgot-password-abuse.response.dto';
import type { AnalyticForgotPasswordConversionResponseDto } from '@modules/analytic/dtos/response/analytic.forgot-password-conversion.response.dto';
import type { AnalyticFraudRiskScoreResponseDto } from '@modules/analytic/dtos/response/analytic.fraud-risk-score.response.dto';
import type { AnalyticFraudSummaryResponseDto } from '@modules/analytic/dtos/response/analytic.fraud-summary.response.dto';
import type { AnalyticImpossibleTravelResponseDto } from '@modules/analytic/dtos/response/analytic.impossible-travel.response.dto';
import type { AnalyticKeyCountResponseDto } from '@modules/analytic/dtos/response/analytic.key-count.response.dto';
import type { AnalyticLockoutResponseDto } from '@modules/analytic/dtos/response/analytic.lockout.response.dto';
import type { AnalyticLoginSpikeIpResponseDto } from '@modules/analytic/dtos/response/analytic.login-spike-ip.response.dto';
import type { AnalyticLoginTimeAnomalyResponseDto } from '@modules/analytic/dtos/response/analytic.login-time-anomaly.response.dto';
import type { AnalyticMetricCountResponseDto } from '@modules/analytic/dtos/response/analytic.metric-count.response.dto';
import type { AnalyticMetricRateResponseDto } from '@modules/analytic/dtos/response/analytic.metric-rate.response.dto';
import type { AnalyticMobileChurnResponseDto } from '@modules/analytic/dtos/response/analytic.mobile-churn.response.dto';
import type { AnalyticNearLockoutResponseDto } from '@modules/analytic/dtos/response/analytic.near-lockout.response.dto';
import type { AnalyticPasswordExpiryResponseDto } from '@modules/analytic/dtos/response/analytic.password-expiry.response.dto';
import type { AnalyticProjectCountResponseDto } from '@modules/analytic/dtos/response/analytic.project-count.response.dto';
import type { AnalyticProjectCreationResponseDto } from '@modules/analytic/dtos/response/analytic.project-creation.response.dto';
import type { AnalyticSessionAfterAdminResponseDto } from '@modules/analytic/dtos/response/analytic.session-after-admin.response.dto';
import type { AnalyticSessionDeviceRatioResponseDto } from '@modules/analytic/dtos/response/analytic.session-device-ratio.response.dto';
import type { AnalyticSharedFingerprintResponseDto } from '@modules/analytic/dtos/response/analytic.shared-fingerprint.response.dto';
import type { AnalyticStatusCountResponseDto } from '@modules/analytic/dtos/response/analytic.status-count.response.dto';
import type { AnalyticTermPolicyAcceptanceRateResponseDto } from '@modules/analytic/dtos/response/analytic.term-policy-acceptance-rate.response.dto';
import type { AnalyticTermPolicyTimeToAcceptResponseDto } from '@modules/analytic/dtos/response/analytic.term-policy-time-to-accept.response.dto';
import type { AnalyticTwoFactorAdoptionResponseDto } from '@modules/analytic/dtos/response/analytic.two-factor-adoption.response.dto';
import type { AnalyticTwoFactorAttemptResponseDto } from '@modules/analytic/dtos/response/analytic.two-factor-attempt.response.dto';
import type { AnalyticUserCountResponseDto } from '@modules/analytic/dtos/response/analytic.user-count.response.dto';
import type { AnalyticVerificationFunnelResponseDto } from '@modules/analytic/dtos/response/analytic.verification-funnel.response.dto';
import type { AnalyticWorkspaceCountResponseDto } from '@modules/analytic/dtos/response/analytic.workspace-count.response.dto';
import { applyDecorators } from '@nestjs/common';

export function AnalyticAdminUsersRegistrationsDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get user registration count by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricCountResponseDto>(
            'analytic.usersRegistrations',
            {
                schema: AnalyticMetricCountResponseSchema,
            }
        )
    );
}

export function AnalyticAdminUsersChurnDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get user churn rate by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricRateResponseDto>('analytic.usersChurn', {
            schema: AnalyticMetricRateResponseSchema,
        })
    );
}

export function AnalyticAdminUsersBlockedDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get blocked user counts by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticBlockedUsersResponseDto>('analytic.usersBlocked', {
            schema: AnalyticBlockedUsersResponseSchema,
        })
    );
}

export function AnalyticAdminUsersSignUpWithDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get user sign up method distribution' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticBucketsResponseDto>('analytic.usersSignUpWith', {
            schema: AnalyticBucketsResponseSchema,
        })
    );
}

export function AnalyticAdminUsersSignUpFromDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get user sign up source distribution' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticBucketsResponseDto>('analytic.usersSignUpFrom', {
            schema: AnalyticBucketsResponseSchema,
        })
    );
}

export function AnalyticAdminUsersEmailVerificationDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get user email verification rate' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricRateResponseDto>(
            'analytic.usersEmailVerification',
            {
                schema: AnalyticMetricRateResponseSchema,
            }
        )
    );
}

export function AnalyticAdminUsersMobileVerificationDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get user mobile verification rate' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricRateResponseDto>(
            'analytic.usersMobileVerification',
            {
                schema: AnalyticMetricRateResponseSchema,
            }
        )
    );
}

export function AnalyticAdminUsersStatusDistributionDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get user status distribution' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticBucketsResponseDto>(
            'analytic.usersStatusDistribution',
            {
                schema: AnalyticBucketsResponseSchema,
            }
        )
    );
}

export function AnalyticAdminUsersCountryDistributionDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get user country distribution' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticBucketsResponseDto>(
            'analytic.usersCountryDistribution',
            {
                schema: AnalyticBucketsResponseSchema,
            }
        )
    );
}

export function AnalyticAdminUsersRoleDistributionDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get user role distribution' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticBucketsResponseDto>(
            'analytic.usersRoleDistribution',
            {
                schema: AnalyticBucketsResponseSchema,
            }
        )
    );
}

export function AnalyticAdminUsersSelfDeleteDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get user self delete count by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricCountResponseDto>(
            'analytic.usersSelfDelete',
            {
                schema: AnalyticMetricCountResponseSchema,
            }
        )
    );
}

export function AnalyticAdminUsersClaimUsernameDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get username claim count by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricCountResponseDto>(
            'analytic.usersClaimUsername',
            {
                schema: AnalyticMetricCountResponseSchema,
            }
        )
    );
}

export function AnalyticAdminUsersMobileChurnDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get user mobile number churn by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMobileChurnResponseDto>(
            'analytic.usersMobileChurn',
            {
                schema: AnalyticMobileChurnResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAuthLoginFrequencyDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get login frequency by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricCountResponseDto>(
            'analytic.authLoginFrequency',
            {
                schema: AnalyticMetricCountResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAuthLoginMethodDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get login method distribution' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticBucketsResponseDto>('analytic.authLoginMethod', {
            schema: AnalyticBucketsResponseSchema,
        })
    );
}

export function AnalyticAdminAuthLoginSourceDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get login source distribution' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticBucketsResponseDto>('analytic.authLoginSource', {
            schema: AnalyticBucketsResponseSchema,
        })
    );
}

export function AnalyticAdminAuthLockoutDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get account lockout metrics by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticLockoutResponseDto>('analytic.authLockout', {
            schema: AnalyticLockoutResponseSchema,
        })
    );
}

export function AnalyticAdminAuthSessionRevokeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get session revoke count by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricCountResponseDto>(
            'analytic.authSessionRevoke',
            {
                schema: AnalyticMetricCountResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAuthConcurrentSessionsDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get concurrent session distribution' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticBucketsResponseDto>(
            'analytic.authConcurrentSessions',
            {
                schema: AnalyticBucketsResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAuthSessionsGeoDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get session country distribution' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticBucketsResponseDto>('analytic.authSessionsGeo', {
            schema: AnalyticBucketsResponseSchema,
        })
    );
}

export function AnalyticAdminAuthSessionsUserAgentDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get session user agent distribution' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticBucketsResponseDto>(
            'analytic.authSessionsUserAgent',
            {
                schema: AnalyticBucketsResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAuthRefreshTokenVolumeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get refresh token volume by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricCountResponseDto>(
            'analytic.authRefreshTokenVolume',
            {
                schema: AnalyticMetricCountResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAuthLogoutRateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get logout count by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricCountResponseDto>('analytic.authLogoutRate', {
            schema: AnalyticMetricCountResponseSchema,
        })
    );
}

export function AnalyticAdminAuthVerificationFunnelDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'admin get email and mobile verification funnels by date range',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticVerificationFunnelResponseDto>(
            'analytic.authVerificationFunnel',
            {
                schema: AnalyticVerificationFunnelResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAuthPasswordExpiryDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get password expiry snapshot' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticPasswordExpiryResponseDto>(
            'analytic.authPasswordExpiry',
            {
                schema: AnalyticPasswordExpiryResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAuthPasswordChangeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get password change count by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricCountResponseDto>(
            'analytic.authPasswordChange',
            {
                schema: AnalyticMetricCountResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAuthForgotPasswordConversionDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get forgot password conversion by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticForgotPasswordConversionResponseDto>(
            'analytic.authForgotPasswordConversion',
            {
                schema: AnalyticForgotPasswordConversionResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAuthAdminForcePasswordDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'admin get admin forced password change count by date range',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricCountResponseDto>(
            'analytic.authAdminForcePassword',
            {
                schema: AnalyticMetricCountResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAuthTwoFactorAdoptionDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get two factor adoption snapshot' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticTwoFactorAdoptionResponseDto>(
            'analytic.authTwoFactorAdoption',
            {
                schema: AnalyticTwoFactorAdoptionResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAuthTwoFactorAdminResetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'admin get admin two factor reset count by date range',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricCountResponseDto>(
            'analytic.authTwoFactorAdminReset',
            {
                schema: AnalyticMetricCountResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAuthTwoFactorVerifySuccessDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'admin get two factor verify success count by date range',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricCountResponseDto>(
            'analytic.authTwoFactorVerifySuccess',
            {
                schema: AnalyticMetricCountResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAuthBackupCodeRegenerationDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'admin get backup code regeneration count by date range',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricCountResponseDto>(
            'analytic.authBackupCodeRegeneration',
            {
                schema: AnalyticMetricCountResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAuthTwoFactorAttemptDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get two factor attempt snapshot' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticTwoFactorAttemptResponseDto>(
            'analytic.authTwoFactorAttempt',
            {
                schema: AnalyticTwoFactorAttemptResponseSchema,
            }
        )
    );
}

export function AnalyticAdminDevicesRegistrationDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get device registration count by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricCountResponseDto>(
            'analytic.devicesRegistration',
            {
                schema: AnalyticMetricCountResponseSchema,
            }
        )
    );
}

export function AnalyticAdminDevicesPlatformDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get device platform distribution' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticBucketsResponseDto>('analytic.devicesPlatform', {
            schema: AnalyticBucketsResponseSchema,
        })
    );
}

export function AnalyticAdminDevicesPushTokenDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get device push token coverage rate' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricRateResponseDto>(
            'analytic.devicesPushToken',
            {
                schema: AnalyticMetricRateResponseSchema,
            }
        )
    );
}

export function AnalyticAdminDevicesInfoRefreshDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get device info refresh count by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricCountResponseDto>(
            'analytic.devicesInfoRefresh',
            {
                schema: AnalyticMetricCountResponseSchema,
            }
        )
    );
}

export function AnalyticAdminDevicesSessionRatioDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get session to device ratio' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticSessionDeviceRatioResponseDto>(
            'analytic.devicesSessionRatio',
            {
                schema: AnalyticSessionDeviceRatioResponseSchema,
            }
        )
    );
}

export function AnalyticAdminDevicesPerUserDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get device per user distribution' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticBucketsResponseDto>('analytic.devicesPerUser', {
            schema: AnalyticBucketsResponseSchema,
        })
    );
}

export function AnalyticAdminDevicesInactivityDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get inactive device count' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricCountResponseDto>(
            'analytic.devicesInactivity',
            {
                schema: AnalyticMetricCountResponseSchema,
            }
        )
    );
}

export function AnalyticAdminApiKeysLifecycleDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get api key lifecycle counts by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticApiKeyLifecycleResponseDto>(
            'analytic.apiKeysLifecycle',
            {
                schema: AnalyticApiKeyLifecycleResponseSchema,
            }
        )
    );
}

export function AnalyticAdminApiKeysActiveExpiredDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get active and expired api key counts' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticApiKeyActiveExpiredResponseDto>(
            'analytic.apiKeysActiveExpired',
            {
                schema: AnalyticApiKeyActiveExpiredResponseSchema,
            }
        )
    );
}

export function AnalyticAdminApiKeysTypeMixDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get api key type distribution' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticBucketsResponseDto>('analytic.apiKeysTypeMix', {
            schema: AnalyticBucketsResponseSchema,
        })
    );
}

export function AnalyticAdminTermPoliciesAcceptanceRateDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get term policy acceptance rate' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticTermPolicyAcceptanceRateResponseDto>(
            'analytic.termPoliciesAcceptanceRate',
            {
                schema: AnalyticTermPolicyAcceptanceRateResponseSchema,
            }
        )
    );
}

export function AnalyticAdminTermPoliciesTimeToAcceptDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get term policy time to accept' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticTermPolicyTimeToAcceptResponseDto>(
            'analytic.termPoliciesTimeToAccept',
            {
                schema: AnalyticTermPolicyTimeToAcceptResponseSchema,
            }
        )
    );
}

export function AnalyticAdminWorkspacesCreationDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get workspace creation count by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticMetricCountResponseDto>(
            'analytic.workspacesCreation',
            {
                schema: AnalyticMetricCountResponseSchema,
            }
        )
    );
}

export function AnalyticAdminWorkspacesVisibilityDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get workspace visibility distribution' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticBucketsResponseDto>(
            'analytic.workspacesVisibility',
            {
                schema: AnalyticBucketsResponseSchema,
            }
        )
    );
}

export function AnalyticAdminWorkspacesInviteFunnelDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get workspace invite funnel by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticStatusCountResponseDto>(
            'analytic.workspacesInviteFunnel',
            {
                schema: AnalyticStatusCountResponseSchema,
            }
        )
    );
}

export function AnalyticAdminWorkspacesJoinOutcomesDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'admin get workspace join request outcomes by date range',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticStatusCountResponseDto>(
            'analytic.workspacesJoinOutcomes',
            {
                schema: AnalyticStatusCountResponseSchema,
            }
        )
    );
}

export function AnalyticAdminWorkspacesMembershipDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get member counts per workspace' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<AnalyticWorkspaceCountResponseDto>(
            'analytic.workspacesMembership',
            {
                schema: AnalyticWorkspaceCountResponseSchema,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function AnalyticAdminWorkspacesActivityVolumeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'admin get activity volume per workspace by date range',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<AnalyticWorkspaceCountResponseDto>(
            'analytic.workspacesActivityVolume',
            {
                schema: AnalyticWorkspaceCountResponseSchema,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function AnalyticAdminProjectsCreationDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get project creation counts by date range' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticProjectCreationResponseDto>(
            'analytic.projectsCreation',
            {
                schema: AnalyticProjectCreationResponseSchema,
            }
        )
    );
}

export function AnalyticAdminProjectsMembershipDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get member counts per project' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<AnalyticProjectCountResponseDto>(
            'analytic.projectsMembership',
            {
                schema: AnalyticProjectCountResponseSchema,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function AnalyticAdminFraudCredentialStuffingDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get credential stuffing fraud summary' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticFraudSummaryResponseDto>(
            'analytic.fraudCredentialStuffing',
            {
                schema: AnalyticFraudSummaryResponseSchema,
            }
        )
    );
}

export function AnalyticAdminFraudCredentialStuffingListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get all credential stuffing fraud detections' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<AnalyticCredentialStuffingResponseDto>(
            'analytic.fraudCredentialStuffingList',
            {
                schema: AnalyticCredentialStuffingResponseSchema,
                availableOrderBy: AnalyticCredentialStuffingAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function AnalyticAdminFraudAccountTakeoverDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get account takeover fraud summary' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticFraudSummaryResponseDto>(
            'analytic.fraudAccountTakeover',
            {
                schema: AnalyticFraudSummaryResponseSchema,
            }
        )
    );
}

export function AnalyticAdminFraudAccountTakeoverListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get all account takeover fraud detections' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<AnalyticAccountTakeoverResponseDto>(
            'analytic.fraudAccountTakeoverList',
            {
                schema: AnalyticAccountTakeoverResponseSchema,
                availableOrderBy: AnalyticAccountTakeoverAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function AnalyticAdminFraudMassRegistrationDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get mass registration fraud summary' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticFraudSummaryResponseDto>(
            'analytic.fraudMassRegistration',
            {
                schema: AnalyticFraudSummaryResponseSchema,
            }
        )
    );
}

export function AnalyticAdminFraudMassRegistrationListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get all mass registration fraud detections' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<AnalyticKeyCountResponseDto>(
            'analytic.fraudMassRegistrationList',
            {
                schema: AnalyticKeyCountResponseSchema,
                availableOrderBy: AnalyticKeyCountAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function AnalyticAdminFraudPasswordResetEnumerationDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get password reset enumeration fraud summary' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticFraudSummaryResponseDto>(
            'analytic.fraudPasswordResetEnumeration',
            {
                schema: AnalyticFraudSummaryResponseSchema,
            }
        )
    );
}

export function AnalyticAdminFraudPasswordResetEnumerationListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'admin get all password reset enumeration fraud detections',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<AnalyticKeyCountResponseDto>(
            'analytic.fraudPasswordResetEnumerationList',
            {
                schema: AnalyticKeyCountResponseSchema,
                availableOrderBy: AnalyticKeyCountAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function AnalyticAdminFraudSharedFingerprintDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get shared device fingerprint fraud summary' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticFraudSummaryResponseDto>(
            'analytic.fraudSharedFingerprint',
            {
                schema: AnalyticFraudSummaryResponseSchema,
            }
        )
    );
}

export function AnalyticAdminFraudSharedFingerprintListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'admin get all shared device fingerprint fraud detections',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<AnalyticSharedFingerprintResponseDto>(
            'analytic.fraudSharedFingerprintList',
            {
                schema: AnalyticSharedFingerprintResponseSchema,
                availableOrderBy: AnalyticSharedFingerprintAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function AnalyticAdminFraudSessionAfterAdminDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get session after admin action fraud summary' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticFraudSummaryResponseDto>(
            'analytic.fraudSessionAfterAdmin',
            {
                schema: AnalyticFraudSummaryResponseSchema,
            }
        )
    );
}

export function AnalyticAdminFraudSessionAfterAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'admin get all session after admin action fraud detections',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<AnalyticSessionAfterAdminResponseDto>(
            'analytic.fraudSessionAfterAdminList',
            {
                schema: AnalyticSessionAfterAdminResponseSchema,
                availableOrderBy: AnalyticSessionAfterAdminAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function AnalyticAdminFraudForgotPasswordTokenAbuseDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get forgot password token abuse fraud summary' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticFraudSummaryResponseDto>(
            'analytic.fraudForgotPasswordTokenAbuse',
            {
                schema: AnalyticFraudSummaryResponseSchema,
            }
        )
    );
}

export function AnalyticAdminFraudForgotPasswordTokenAbuseListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'admin get all forgot password token abuse fraud detections',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<AnalyticForgotPasswordAbuseResponseDto>(
            'analytic.fraudForgotPasswordTokenAbuseList',
            {
                schema: AnalyticForgotPasswordAbuseResponseSchema,
                availableOrderBy: AnalyticForgotPasswordAbuseAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function AnalyticAdminFraudRefreshSpikeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get refresh token spike fraud summary' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticFraudSummaryResponseDto>(
            'analytic.fraudRefreshSpike',
            {
                schema: AnalyticFraudSummaryResponseSchema,
            }
        )
    );
}

export function AnalyticAdminFraudRefreshSpikeListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get all refresh token spike fraud detections' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<AnalyticUserCountResponseDto>(
            'analytic.fraudRefreshSpikeList',
            {
                schema: AnalyticUserCountResponseSchema,
                availableOrderBy: AnalyticUserCountAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function AnalyticAdminFraudBackupCodeNewDeviceDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get backup code on new device fraud summary' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticFraudSummaryResponseDto>(
            'analytic.fraudBackupCodeNewDevice',
            {
                schema: AnalyticFraudSummaryResponseSchema,
            }
        )
    );
}

export function AnalyticAdminFraudBackupCodeNewDeviceListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'admin get all backup code on new device fraud detections',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<AnalyticBackupCodeNewDeviceResponseDto>(
            'analytic.fraudBackupCodeNewDeviceList',
            {
                schema: AnalyticBackupCodeNewDeviceResponseSchema,
                availableOrderBy: AnalyticBackupCodeNewDeviceAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function AnalyticAdminFraudApiKeyBurstDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get api key burst fraud summary' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticFraudSummaryResponseDto>(
            'analytic.fraudApiKeyBurst',
            {
                schema: AnalyticFraudSummaryResponseSchema,
            }
        )
    );
}

export function AnalyticAdminFraudApiKeyBurstListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get all api key burst fraud detections' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<AnalyticUserCountResponseDto>(
            'analytic.fraudApiKeyBurstList',
            {
                schema: AnalyticUserCountResponseSchema,
                availableOrderBy: AnalyticUserCountAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function AnalyticAdminFraudRiskScoreDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get fraud risk score of a user (report-only)' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticFraudRiskScoreResponseDto>(
            'analytic.fraudRiskScore',
            {
                schema: AnalyticFraudRiskScoreResponseSchema,
            }
        )
    );
}

export function AnalyticAdminFraudRiskScoresDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get all user fraud risk scores' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<AnalyticFraudRiskScoreResponseDto>(
            'analytic.fraudRiskScores',
            {
                schema: AnalyticFraudRiskScoreResponseSchema,
                availableOrderBy: AnalyticFraudRiskScoreAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function AnalyticAdminAnomalyImpossibleTravelDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get impossible travel anomaly summary' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticAnomalySummaryResponseDto>(
            'analytic.anomalyImpossibleTravel',
            {
                schema: AnalyticAnomalySummaryResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAnomalyImpossibleTravelListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get all impossible travel anomaly detections' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<AnalyticImpossibleTravelResponseDto>(
            'analytic.anomalyImpossibleTravelList',
            {
                schema: AnalyticImpossibleTravelResponseSchema,
                availableOrderBy: AnalyticImpossibleTravelAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function AnalyticAdminAnomalyLoginSpikeIpDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get login spike by ip anomaly summary' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticAnomalySummaryResponseDto>(
            'analytic.anomalyLoginSpikeIp',
            {
                schema: AnalyticAnomalySummaryResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAnomalyLoginSpikeIpListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get all login spike by ip anomaly detections' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<AnalyticLoginSpikeIpResponseDto>(
            'analytic.anomalyLoginSpikeIpList',
            {
                schema: AnalyticLoginSpikeIpResponseSchema,
                availableOrderBy: AnalyticLoginSpikeIpAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function AnalyticAdminAnomalyFailedLoginSpikeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get failed login spike anomaly summary' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticAnomalySummaryResponseDto>(
            'analytic.anomalyFailedLoginSpike',
            {
                schema: AnalyticAnomalySummaryResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAnomalyFailedLoginSpikeListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get all failed login spike anomaly detections' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<AnalyticNearLockoutResponseDto>(
            'analytic.anomalyFailedLoginSpikeList',
            {
                schema: AnalyticNearLockoutResponseSchema,
                availableOrderBy: AnalyticNearLockoutAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function AnalyticAdminAnomalyDeviceProliferationDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get device proliferation anomaly summary' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticAnomalySummaryResponseDto>(
            'analytic.anomalyDeviceProliferation',
            {
                schema: AnalyticAnomalySummaryResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAnomalyDeviceProliferationListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'admin get all device proliferation anomaly detections',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<AnalyticDeviceProliferationResponseDto>(
            'analytic.anomalyDeviceProliferationList',
            {
                schema: AnalyticDeviceProliferationResponseSchema,
                availableOrderBy: AnalyticDeviceProliferationAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function AnalyticAdminAnomalyLoginTimeDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get login time anomaly summary' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticAnomalySummaryResponseDto>(
            'analytic.anomalyLoginTime',
            {
                schema: AnalyticAnomalySummaryResponseSchema,
            }
        )
    );
}

export function AnalyticAdminAnomalyLoginTimeListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get all login time anomaly detections' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<AnalyticLoginTimeAnomalyResponseDto>(
            'analytic.anomalyLoginTimeList',
            {
                schema: AnalyticLoginTimeAnomalyResponseSchema,
                availableOrderBy: AnalyticLoginTimeAnomalyAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}
