import type {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
} from '@modules/analytic/enums/analytic.enum';

export interface IAnalyticFraudSummary {
    count: number;
    window: string | null;
}

export interface IAnalyticFraudCredentialStuffingSummaryMeta {
    minUniqueAccounts: number;
}

export interface IAnalyticFraudCredentialStuffingSummary extends IAnalyticFraudSummary {
    meta: IAnalyticFraudCredentialStuffingSummaryMeta;
}

export interface IAnalyticFraudRiskScore {
    userId: string;
    score: number;
    band: EnumAnalyticFraudBand;
    contributingSignalCodes: EnumAnalyticFraudContributingSignal[];
}

export interface IAnalyticCredentialStuffing {
    ipAddress: string;
    uniqueUsers: number;
    failCount: number;
}

export interface IAnalyticAccountTakeover {
    userId: string;
    indicatorCodes: string[];
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

export interface IAnalyticSharedFingerprint {
    fingerprint: string;
    userCount: number;
    userIds: string[];
}

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
