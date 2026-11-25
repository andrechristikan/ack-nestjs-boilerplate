import type {
    EnumNotificationChannel,
    EnumVerificationType,
} from '@generated/prisma-client/client';

export interface IAnalyticDateRange {
    startDate: Date;
    endDate: Date;
}

export interface IAnalyticOptionalDateRange {
    startDate: Date | null;
    endDate: Date | null;
}

export interface IAnalyticCounted {
    count: number;
}

export type IAnalyticCountBucket = {
    key: string;
    count: number;
};

export interface IAnalyticCountRange {
    key: string;
    min: number;
    max: number | null;
}

export interface IAnalyticBucketsResult {
    buckets: IAnalyticCountBucket[];
}

export interface IAnalyticSnapshotBucketsResult extends IAnalyticBucketsResult {
    computedAt: Date | null;
}

export interface IAnalyticMetricCount {
    count: number;
}

export interface IAnalyticMetricRate {
    count: number;
    total: number;
    rate: number;
}

export interface IAnalyticActiveUsersCount {
    daily: number;
    weekly: number;
    monthly: number;
}

export interface IAnalyticActiveUsers extends IAnalyticActiveUsersCount {
    windowEnd: Date;
    computedAt: Date | null;
}

export interface IAnalyticBlockedUsers {
    trend: number;
    current: number;
}

export interface IAnalyticLockoutMetrics {
    failed: number;
    maxAttempt: number;
}

export interface IAnalyticForgotPasswordConversion {
    created: number;
    used: number;
    rate: number;
}

export interface IAnalyticMfaAdoptionRate {
    enabled: number;
    total: number;
    rate: number;
}

export interface IAnalyticMfaAdoption extends IAnalyticMfaAdoptionRate {
    computedAt: Date | null;
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

export interface IAnalyticDevicePushTokenCount {
    total: number;
    withToken: number;
}

export interface IAnalyticApiKeyActiveExpired {
    active: number;
    expired: number;
    inactive: number;
}

export interface IAnalyticTermPolicyAcceptanceRate {
    acceptances: number;
    users: number;
    published: number;
    rate: number;
}

export interface IAnalyticTermPolicyAcceptanceCount {
    published: number;
    acceptances: number;
    users: number;
}

export interface IAnalyticProjectCreation {
    created: number;
    perWorkspace: IAnalyticWorkspaceCount[];
}

export interface IAnalyticNotificationDelivery {
    channel: EnumNotificationChannel;
    total: number;
    sent: number;
    failed: number;
    pending: number;
}

export interface IAnalyticNotificationDeliveryResult {
    channels: IAnalyticNotificationDelivery[];
}

export type IAnalyticWorkspaceCount = {
    workspaceId: string;
    count: number;
};

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

export type IAnalyticPipelineDate = {
    $date: string;
};

export type IAnalyticPipelineObjectId = {
    $oid: string;
};

export type IAnalyticPipelineSortStage = {
    $sort: Record<string, 1 | -1>;
};

export interface IAnalyticChurnCount {
    deleted: number;
    total: number;
}

export interface IAnalyticVerifiedGroupCount {
    isVerified: boolean;
    count: number;
}

export interface IAnalyticGroupCount {
    key: string | null;
    count: number;
}

export interface IAnalyticUsedGroupCount {
    isUsed: boolean;
    count: number;
}

export interface IAnalyticVerificationGroupCount {
    type: EnumVerificationType;
    isUsed: boolean;
    count: number;
}

export type IAnalyticMfaAdoptionCount = {
    enabled: number;
    total: number;
};

export type IAnalyticBucketsSnapshotMeta = {
    buckets: IAnalyticCountBucket[];
};
