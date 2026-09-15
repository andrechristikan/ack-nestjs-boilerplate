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

export interface IAnalyticCredentialStuffingRow {
    ipAddress: string;
    uniqueUsers: number;
    failCount: number;
}

export interface IAnalyticAccountTakeoverRow {
    userId: string;
    indicatorCodes: string[];
    passwordChangedAt: Date;
}

export interface IAnalyticMassRegistrationRow {
    key: string;
    count: number;
}

export interface IAnalyticPasswordResetEnumerationRow {
    key: string;
    count: number;
}

export interface IAnalyticSharedFingerprintRow {
    fingerprint: string;
    userCount: number;
    userIds: string[];
}

export interface IAnalyticSessionAfterAdminRow {
    userId: string;
    revokedAt: Date;
    loginAt: Date;
}

export interface IAnalyticForgotPasswordAbuseRow {
    userId: string;
    tokenCount: number;
}

export interface IAnalyticRefreshSpikeRow {
    userId: string;
    count: number;
}

export interface IAnalyticBackupCodeNewDeviceRow {
    userId: string;
    regeneratedAt: Date;
}

export interface IAnalyticApiKeyBurstRow {
    userId: string;
    count: number;
}
