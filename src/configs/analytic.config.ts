import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigAnalytic {
    cache: {
        dashboardTtlInMs: number;
        anomalySummaryTtlInMs: number;
        fraudSummaryTtlInMs: number;
        riskScoreTtlInMs: number;
        keyPatterns: {
            dashboard: string;
            anomalySummary: string;
            fraudSummary: string;
            riskScore: string;
        };
        windowTokenPattern: string;
        workspaceWindowTokenPattern: string;
    };
    maxWindowInMs: number;
    anomaly: {
        minSample: number;
        lookbackInMs: number;
        concurrency: number;
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
        loginTimeAnomaly: {
            historicalFrequencyPercent: number;
            historyLimit: number;
        };
    };
    device: {
        inactivityInMs: number;
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
        refreshSpike: {
            windowInMs: number;
            minCount: number;
        };
        backupCodeNewDevice: {
            windowInMs: number;
            newDeviceAfterInMs: number;
        };
        apiKeyBurst: {
            windowInMs: number;
            minCount: number;
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
            candidateLimit: number;
            lookbackInMs: number;
        };
        nearLockoutOffset: number;
        concurrency: number;
    };
    project: {
        perWorkspaceLimit: number;
    };
}

export default registerAs('analytic', (): IConfigAnalytic => ({
    cache: {
        dashboardTtlInMs: ms('30m'),
        anomalySummaryTtlInMs: ms('15m'),
        fraudSummaryTtlInMs: ms('15m'),
        riskScoreTtlInMs: ms('15m'),
        keyPatterns: {
            dashboard: 'Analytic:Dashboard:{metric}:{start}:{end}',
            anomalySummary: 'Analytic:Anomaly:{signal}:{window}',
            fraudSummary: 'Analytic:Fraud:{signal}:{window}',
            riskScore: 'Analytic:Fraud:Risk:{userId}',
        },
        windowTokenPattern: '{start}:{end}',
        workspaceWindowTokenPattern: '{workspaceId}:{start}:{end}',
    },
    maxWindowInMs: ms('90d'),
    anomaly: {
        minSample: 5,
        lookbackInMs: ms('30d'),
        concurrency: 10,
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
        loginTimeAnomaly: {
            historicalFrequencyPercent: 5,
            historyLimit: 1000,
        },
    },
    device: {
        inactivityInMs: ms('30d'),
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
        refreshSpike: {
            windowInMs: ms('10m'),
            minCount: 20,
        },
        backupCodeNewDevice: {
            windowInMs: ms('1h'),
            newDeviceAfterInMs: ms('1h'),
        },
        apiKeyBurst: {
            windowInMs: ms('10m'),
            minCount: 5,
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
            candidateLimit: 100,
            lookbackInMs: ms('24h'),
        },
        concurrency: 10,
        nearLockoutOffset: 1,
    },
    project: {
        perWorkspaceLimit: 100,
    },
}));
