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
        impossibleTravel: {
            minDistanceKm: number;
            maxDeltaInMs: number;
        };
        loginSpikeIp: {
            windowInMs: number;
            minUniqueAccounts: number;
        };
        deviceProliferation: {
            zScoreThreshold: number;
        };
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
        credentialStuffing: {
            windowInMs: number;
            minUniqueAccounts: number;
        };
        accountTakeover: {
            newDeviceAfterPasswordChangeInMs: number;
        };
        massRegistration: {
            windowInMs: number;
            minAccountsPerIp: number;
        };
        passwordResetEnumeration: {
            windowInMs: number;
            minRequestsPerIp: number;
        };
        sharedFingerprint: {
            minUsersPerFingerprint: number;
        };
        sessionAfterAdmin: {
            sessionAfterAdminRevokeInMs: number;
        };
        forgotPasswordTokenAbuse: {
            windowInMs: number;
            minUnusedTokens: number;
        };
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
        riskScore: {
            lookbackInMs: number;
        };
        nearLockoutOffset: number;
    };
    project: {
        perWorkspaceLimit: number;
    };
    snapshot: {
        writeBatchSize: number;
        refreshIntervalInMs: number;
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
        impossibleTravel: {
            minDistanceKm: 500,
            maxDeltaInMs: ms('1h'),
        },
        loginSpikeIp: {
            windowInMs: ms('10m'),
            minUniqueAccounts: 5,
        },
        deviceProliferation: {
            zScoreThreshold: 3,
        },
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
        credentialStuffing: {
            windowInMs: ms('5m'),
            minUniqueAccounts: 10,
        },
        accountTakeover: {
            newDeviceAfterPasswordChangeInMs: ms('1h'),
        },
        massRegistration: {
            windowInMs: ms('1h'),
            minAccountsPerIp: 5,
        },
        passwordResetEnumeration: {
            windowInMs: ms('10m'),
            minRequestsPerIp: 10,
        },
        sharedFingerprint: {
            minUsersPerFingerprint: 2,
        },
        sessionAfterAdmin: {
            sessionAfterAdminRevokeInMs: ms('5m'),
        },
        forgotPasswordTokenAbuse: {
            windowInMs: ms('24h'),
            minUnusedTokens: 5,
        },
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
        riskScore: {
            lookbackInMs: ms('24h'),
        },
        nearLockoutOffset: 1,
    },
    project: {
        perWorkspaceLimit: 100,
    },
    snapshot: {
        writeBatchSize: 1000,
        refreshIntervalInMs: ms('15m'),
    },
}));
