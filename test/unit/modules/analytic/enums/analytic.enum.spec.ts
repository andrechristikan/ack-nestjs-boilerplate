import {
    EnumAnalyticAnomalySignal,
    EnumAnalyticDashboardMetric,
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
    EnumAnalyticFraudSignal,
} from '@modules/analytic/enums/analytic.enum';

describe('analytic enums', () => {
    it('keeps the anomaly signal cache-key values', () => {
        expect({ ...EnumAnalyticAnomalySignal }).toEqual({
            impossibleTravel: 'impossible-travel',
            loginSpikeIp: 'login-spike-ip',
            failedLoginSpike: 'failed-login-spike',
            deviceProliferation: 'device-proliferation',
            loginTime: 'login-time',
        });
    });

    it('keeps the fraud signal cache-key values', () => {
        expect({ ...EnumAnalyticFraudSignal }).toEqual({
            credentialStuffing: 'credential-stuffing',
            accountTakeover: 'account-takeover',
            massRegistration: 'mass-registration',
            passwordResetEnumeration: 'password-reset-enumeration',
            sharedFingerprint: 'shared-fingerprint',
            sessionAfterAdmin: 'session-after-admin',
            forgotPasswordTokenAbuse: 'forgot-password-token-abuse',
            refreshSpike: 'refresh-spike',
            backupCodeNewDevice: 'backup-code-new-device',
            apiKeyBurst: 'api-key-burst',
        });
    });

    it('keeps the fraud band wire values', () => {
        expect({ ...EnumAnalyticFraudBand }).toEqual({
            monitor: 'monitor',
            review: 'review',
            elevate: 'elevate',
            critical: 'critical',
        });
    });

    it('keeps the contributing signal wire values', () => {
        expect({ ...EnumAnalyticFraudContributingSignal }).toEqual({
            nearLockout: 'nearLockout',
            sharedFingerprint: 'sharedFingerprint',
        });
    });

    it('keeps the dashboard metric cache-key values', () => {
        expect({ ...EnumAnalyticDashboardMetric }).toEqual({
            usersRegistrations: 'users.registrations',
            usersChurn: 'users.churn',
            usersBlocked: 'users.blocked',
            usersSignUpWith: 'users.signUpWith',
            usersSignUpFrom: 'users.signUpFrom',
            usersEmailVerification: 'users.emailVerification',
            usersMobileVerification: 'users.mobileVerification',
            usersStatus: 'users.status',
            usersCountry: 'users.country',
            usersRole: 'users.role',
            usersSelfDelete: 'users.selfDelete',
            usersClaimUsername: 'users.claimUsername',
            usersMobileChurn: 'users.mobileChurn',
            authLoginFrequency: 'auth.loginFrequency',
            authLoginMethod: 'auth.loginMethod',
            authLockout: 'auth.lockout',
            authSessionRevoke: 'auth.sessionRevoke',
            authConcurrent: 'auth.concurrent',
            authSessionsGeo: 'auth.sessionsGeo',
            authSessionsUa: 'auth.sessionsUa',
            authRefresh: 'auth.refresh',
            authLogout: 'auth.logout',
            authVerificationFunnel: 'auth.verificationFunnel',
            authPasswordExpiry: 'auth.passwordExpiry',
            authPasswordChange: 'auth.passwordChange',
            authForgotConversion: 'auth.forgotConversion',
            authAdminForcePassword: 'auth.adminForcePassword',
            authTwoFactorAdoption: 'auth.twoFactorAdoption',
            authTwoFactorAdminReset: 'auth.twoFactorAdminReset',
            authTwoFactorVerify: 'auth.twoFactorVerify',
            authBackupCodeRegeneration: 'auth.backupCodeRegeneration',
            authTwoFactorAttempt: 'auth.twoFactorAttempt',
            devicesRegistration: 'devices.registration',
            devicesPlatform: 'devices.platform',
            devicesPushToken: 'devices.pushToken',
            devicesInfoRefresh: 'devices.infoRefresh',
            devicesSessionRatio: 'devices.sessionRatio',
            devicesPerUser: 'devices.perUser',
            devicesInactivity: 'devices.inactivity',
            apiKeysLifecycle: 'apiKeys.lifecycle',
            apiKeysActiveExpired: 'apiKeys.activeExpired',
            apiKeysTypeMix: 'apiKeys.typeMix',
            termPoliciesAcceptance: 'termPolicies.acceptance',
            termPoliciesTimeToAccept: 'termPolicies.timeToAccept',
            workspacesCreation: 'workspaces.creation',
            workspacesVisibility: 'workspaces.visibility',
            workspacesInviteFunnel: 'workspaces.inviteFunnel',
            workspacesJoinOutcomes: 'workspaces.joinOutcomes',
            workspacesMembership: 'workspaces.membership',
            workspacesActivity: 'workspaces.activity',
            workspaceSummary: 'workspace.summary',
            projectsCreation: 'projects.creation',
            projectsMembership: 'projects.membership',
        });
    });
});
