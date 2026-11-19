import type {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
} from '@modules/analytic/enums/analytic.enum';
import type { IAnalyticImpossibleTravelThresholds } from '@modules/analytic/interfaces/analytic.anomaly.interface';

export interface IAnalyticFraudSummary {
    count: number;
    windowStart: Date | null;
    windowEnd: Date | null;
    computedAt: Date | null;
}

export type IAnalyticFraudCredentialStuffingSummaryMetadata = {
    minUniqueAccounts: number;
};

export interface IAnalyticFraudCredentialStuffingSummary extends IAnalyticFraudSummary {
    metadata: IAnalyticFraudCredentialStuffingSummaryMetadata;
}

export type IAnalyticFraudRiskScore = {
    userId: string;
    score: number;
    band: EnumAnalyticFraudBand;
    contributingSignalCodes: EnumAnalyticFraudContributingSignal[];
};

export interface IAnalyticFraudRiskScoreUser extends IAnalyticFraudRiskScore {
    computedAt: Date | null;
}

export type IAnalyticCredentialStuffing = {
    ipAddress: string;
    uniqueUsers: number;
    failCount: number;
};

export interface IAnalyticAccountTakeover {
    userId: string;
    indicatorCodes: EnumAnalyticFraudContributingSignal[];
    passwordChangedAt: Date;
}

export interface IAnalyticMassRegistration {
    key: string;
    count: number;
}

export interface IAnalyticPasswordResetEnumeration {
    key: string;
    count: number;
}

export type IAnalyticSharedFingerprint = {
    fingerprint: string;
    userCount: number;
    userIds: string[];
};

export interface IAnalyticSessionAfterAdmin {
    userId: string;
    revokedAt: Date;
    loginAt: Date;
}

export interface IAnalyticForgotPasswordAbuse {
    userId: string;
    tokenCount: number;
}

export interface IAnalyticRefreshSpike {
    userId: string;
    count: number;
}

export interface IAnalyticBackupCodeNewDevice {
    userId: string;
    regeneratedAt: Date;
}

export interface IAnalyticApiKeyBurst {
    userId: string;
    count: number;
}

export interface IAnalyticRiskScoreOptions {
    now: Date;
    nearLockoutMinAttempt: number;
    riskScore: { lookbackInMs: number };
    credentialStuffing: { windowInMs: number; minUniqueAccounts: number };
    accountTakeover: { newDeviceAfterPasswordChangeInMs: number };
    massRegistration: { windowInMs: number; minAccountsPerIp: number };
    sharedFingerprint: { minUsersPerFingerprint: number };
    sessionAfterAdmin: { sessionAfterAdminRevokeInMs: number };
    forgotPasswordTokenAbuse: { windowInMs: number; minUnusedTokens: number };
    impossibleTravel: IAnalyticImpossibleTravelThresholds;
    weights: Record<EnumAnalyticFraudContributingSignal, number>;
    bands: { monitorMax: number; reviewMax: number; elevateMax: number };
}
