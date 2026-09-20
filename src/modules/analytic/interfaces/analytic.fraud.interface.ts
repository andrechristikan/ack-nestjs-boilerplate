export interface IAnalyticFraudSummaryMeta {
    minUniqueAccounts?: number;
}

export interface IAnalyticFraudSummary {
    count: number;
    window?: string;
    meta?: IAnalyticFraudSummaryMeta;
}

export interface IAnalyticFraudRiskScore {
    userId: string;
    score: number;
    band: string;
    contributingSignalCodes: string[];
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
