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
            anomaly: string;
            fraud: string;
            riskScore: string;
        };
        windowTokenPattern: string;
        workspaceWindowTokenPattern: string;
    };
    anomaly: {
        impossibleTravel: {
            minDistanceKm: number;
            maxDeltaInMs: number;
        };
        loginSpikeIp: {
            windowInMs: number;
            minUniqueAccounts: number;
        };
        failedLoginSpike: {
            nearLockoutOffset: number;
        };
        deviceProliferation: {
            zScoreThreshold: number;
        };
        loginTimeAnomaly: {
            historicalFrequencyPercent: number;
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
        refreshSpike: {
            windowInMs: number;
            minEvents: number;
        };
        backupCodeNewDevice: {
            windowInMs: number;
        };
        apiKeyBurst: {
            windowInMs: number;
            minEvents: number;
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
        bandLabels: {
            monitor: string;
            review: string;
            elevate: string;
            critical: string;
        };
    };
}

export default registerAs('analytic', (): IConfigAnalytic => ({
    cache: {
        dashboardTtlInMs: ms('1h'),
        anomalySummaryTtlInMs: ms('5m'),
        fraudSummaryTtlInMs: ms('5m'),
        riskScoreTtlInMs: ms('10m'),
        keyPatterns: {
            dashboard: 'Analytic:dashboard:{metric}:{start}:{end}',
            anomaly: 'Analytic:anomaly:{signal}:{window}',
            fraud: 'Analytic:fraud:{signal}:{window}',
            riskScore: 'Analytic:fraud:risk:{userId}',
        },
        windowTokenPattern: '{start}:{end}',
        workspaceWindowTokenPattern: '{workspaceId}:{start}:{end}',
    },
    anomaly: {
        impossibleTravel: {
            minDistanceKm: 500,
            maxDeltaInMs: ms('1h'),
        },
        loginSpikeIp: {
            windowInMs: ms('10m'),
            minUniqueAccounts: 5,
        },
        failedLoginSpike: {
            nearLockoutOffset: 1,
        },
        deviceProliferation: {
            zScoreThreshold: 3,
        },
        loginTimeAnomaly: {
            historicalFrequencyPercent: 5,
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
        refreshSpike: {
            windowInMs: ms('10m'),
            minEvents: 20,
        },
        backupCodeNewDevice: {
            windowInMs: ms('1h'),
        },
        apiKeyBurst: {
            windowInMs: ms('10m'),
            minEvents: 5,
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
        bandLabels: {
            monitor: 'monitor',
            review: 'review',
            elevate: 'elevate',
            critical: 'critical',
        },
    },
}));
