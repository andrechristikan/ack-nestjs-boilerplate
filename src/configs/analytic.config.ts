import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigAnalytic {
    cache: {
        dashboardTtlInMs: number;
        anomalySummaryTtlInMs: number;
        liveSummaryTtlInMs: number;
        dashboardKeyPattern: string;
        dashboardPageKeyPattern: string;
        workspaceSummaryKeyPattern: string;
        workspaceInviteFunnelKeyPattern: string;
        workspaceJoinOutcomesKeyPattern: string;
        workspaceMemberRolesKeyPattern: string;
        anomalySummaryKeyPattern: string;
        fraudSummaryKeyPattern: string;
    };
    maxWindowInMs: number;
    anomaly: {
        lookbackInMs: number;
        impossibleTravelMinDistanceKm: number;
        impossibleTravelMaxDeltaInMs: number;
        loginSpikeIpWindowInMs: number;
        loginSpikeIpMinUniqueAccounts: number;
        deviceProliferationZScoreThreshold: number;
    };
    device: {
        inactivityInMs: number;
    };
    user: {
        active: {
            dailyInMs: number;
            weeklyInMs: number;
            monthlyInMs: number;
        };
    };
    fraud: {
        credentialStuffingWindowInMs: number;
        credentialStuffingMinUniqueAccounts: number;
        accountTakeoverNewDeviceAfterPasswordChangeInMs: number;
        massRegistrationWindowInMs: number;
        massRegistrationMinAccountsPerIp: number;
        passwordResetEnumerationWindowInMs: number;
        passwordResetEnumerationMinRequestsPerIp: number;
        sharedFingerprintMinUsersPerFingerprint: number;
        sessionAfterAdminRevokeInMs: number;
        forgotPasswordTokenAbuseWindowInMs: number;
        forgotPasswordTokenAbuseMinUnusedTokens: number;
        weights: {
            sessionAfterAdmin: number;
            impossibleTravel: number;
            newDeviceAfterPasswordChange: number;
            credentialStuffingIp: number;
            sharedFingerprint: number;
            nearLockout: number;
            massRegistrationIp: number;
            forgotPasswordAbuse: number;
        };
        bands: {
            monitorMax: number;
            reviewMax: number;
            elevateMax: number;
        };
        riskScoreLookbackInMs: number;
        nearLockoutOffset: number;
    };
    project: {
        perWorkspaceLimit: number;
    };
    snapshot: {
        writeBatchSize: number;
        refreshIntervalInMs: number;
    };
    queue: {
        maxAttempts: number;
        keepLogs: number;
        removeOnCompleteAgeInSeconds: number;
        removeOnFailAgeInSeconds: number;
        backoffDelayInMs: number;
    };
}

export default registerAs('analytic', (): IConfigAnalytic => ({
    cache: {
        dashboardTtlInMs: ms('30m'),
        anomalySummaryTtlInMs: ms('15m'),
        liveSummaryTtlInMs: ms('1m'),
        dashboardKeyPattern: 'Analytic:Dashboard:{metric}:{start}:{end}',
        dashboardPageKeyPattern:
            'Analytic:Dashboard:{metric}:{start}:{end}:{page}:{perPage}',
        workspaceSummaryKeyPattern:
            'Analytic:Workspace:{workspaceId}:Summary:{start}:{end}',
        workspaceInviteFunnelKeyPattern:
            'Analytic:Workspace:{workspaceId}:InviteFunnel:{start}:{end}',
        workspaceJoinOutcomesKeyPattern:
            'Analytic:Workspace:{workspaceId}:JoinOutcomes:{start}:{end}',
        workspaceMemberRolesKeyPattern:
            'Analytic:Workspace:{workspaceId}:MemberRoles',
        anomalySummaryKeyPattern: 'Analytic:Anomaly:{signal}:{window}',
        fraudSummaryKeyPattern: 'Analytic:Fraud:{signal}:{window}',
    },
    maxWindowInMs: ms('90d'),
    anomaly: {
        lookbackInMs: ms('30d'),
        impossibleTravelMinDistanceKm: 500,
        impossibleTravelMaxDeltaInMs: ms('1h'),
        loginSpikeIpWindowInMs: ms('10m'),
        loginSpikeIpMinUniqueAccounts: 5,
        deviceProliferationZScoreThreshold: 3,
    },
    device: {
        inactivityInMs: ms('30d'),
    },
    user: {
        active: {
            dailyInMs: ms('1d'),
            weeklyInMs: ms('7d'),
            monthlyInMs: ms('30d'),
        },
    },
    fraud: {
        credentialStuffingWindowInMs: ms('5m'),
        credentialStuffingMinUniqueAccounts: 10,
        accountTakeoverNewDeviceAfterPasswordChangeInMs: ms('1h'),
        massRegistrationWindowInMs: ms('1h'),
        massRegistrationMinAccountsPerIp: 5,
        passwordResetEnumerationWindowInMs: ms('10m'),
        passwordResetEnumerationMinRequestsPerIp: 10,
        sharedFingerprintMinUsersPerFingerprint: 2,
        sessionAfterAdminRevokeInMs: ms('5m'),
        forgotPasswordTokenAbuseWindowInMs: ms('24h'),
        forgotPasswordTokenAbuseMinUnusedTokens: 5,
        weights: {
            sessionAfterAdmin: 50,
            impossibleTravel: 40,
            newDeviceAfterPasswordChange: 30,
            credentialStuffingIp: 30,
            sharedFingerprint: 25,
            nearLockout: 20,
            massRegistrationIp: 20,
            forgotPasswordAbuse: 15,
        },
        bands: {
            monitorMax: 30,
            reviewMax: 60,
            elevateMax: 90,
        },
        riskScoreLookbackInMs: ms('24h'),
        nearLockoutOffset: 1,
    },
    project: {
        perWorkspaceLimit: 100,
    },
    snapshot: {
        writeBatchSize: 1000,
        refreshIntervalInMs: ms('15m'),
    },
    queue: {
        maxAttempts: 3,
        keepLogs: 20,
        removeOnCompleteAgeInSeconds: ms('7d') / 1000,
        removeOnFailAgeInSeconds: ms('14d') / 1000,
        backoffDelayInMs: ms('10s'),
    },
}));
