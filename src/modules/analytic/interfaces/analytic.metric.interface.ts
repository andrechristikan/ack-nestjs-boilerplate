export interface IAnalyticDateRange {
    startDate: Date;
    endDate: Date;
}

export interface IAnalyticOptionalDateRange {
    startDate: Date | null;
    endDate: Date | null;
}

export interface IAnalyticCountBucket {
    key: string;
    count: number;
}

export interface IAnalyticBucketsResult {
    buckets: IAnalyticCountBucket[];
}

export interface IAnalyticMetricCount {
    count: number;
}

export interface IAnalyticMetricRate {
    count: number;
    total: number;
    rate: number;
}

export interface IAnalyticBlockedUsers {
    trend: number;
    current: number;
}

export interface IAnalyticLockoutMetrics {
    failed: number;
    maxAttempt: number;
}

export interface IAnalyticPasswordExpiry {
    expired: number;
    total: number;
    compliant: number;
    rate: number;
}

export interface IAnalyticForgotPasswordConversion {
    created: number;
    used: number;
    rate: number;
}

export interface IAnalyticTwoFactorAdoption {
    enabled: number;
    total: number;
    rate: number;
}

export interface IAnalyticTwoFactorAttemptSnapshot {
    usersWithAttempts: number;
    totalAttempts: number;
}

export interface IAnalyticVerificationFunnel {
    used: number;
    unused: number;
    total: number;
    rate: number;
}

export interface IAnalyticVerificationFunnels {
    email: IAnalyticVerificationFunnel;
    mobile: IAnalyticVerificationFunnel;
}

export interface IAnalyticMobileChurn {
    added: number;
    updated: number;
    deleted: number;
}

export interface IAnalyticSessionDeviceRatio {
    sessions: number;
    devices: number;
    ratio: number;
}

export interface IAnalyticApiKeyLifecycle {
    created: number;
    reset: number;
    updated: number;
    deleted: number;
}

export interface IAnalyticApiKeyActiveExpired {
    active: number;
    expired: number;
}

export interface IAnalyticTermPolicyAcceptanceRate {
    acceptances: number;
    users: number;
    published: number;
    rate: number;
}

export interface IAnalyticTermPolicyTimeToAccept {
    count: number;
    averageMs: number;
}

export interface IAnalyticProjectCreation {
    created: number;
    perWorkspace: IAnalyticWorkspaceCount[];
}

export interface IAnalyticWorkspaceCount {
    workspaceId: string;
    count: number;
}

export interface IAnalyticProjectCount {
    projectId: string;
    count: number;
}

export interface IAnalyticRoleCount {
    role: string;
    count: number;
}

export interface IAnalyticStatusCount {
    status: string;
    count: number;
}

export interface IAnalyticStatusCountList {
    statuses: IAnalyticStatusCount[];
}

export interface IAnalyticRoleCountList {
    roles: IAnalyticRoleCount[];
}

export interface IAnalyticWorkspaceSummary {
    memberCount: number;
    projectCount: number;
    activityCount: number;
}
