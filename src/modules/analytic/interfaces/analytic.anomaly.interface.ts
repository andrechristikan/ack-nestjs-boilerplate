export interface IAnalyticAnomalySummary {
    count: number;
    windowStart: Date | null;
    windowEnd: Date | null;
    computedAt: Date | null;
}

export type IAnalyticAnomalyImpossibleTravelSummaryMetadata = {
    minDistanceKm: number;
    maxDeltaInMs: number;
};

export interface IAnalyticAnomalyImpossibleTravelSummary extends IAnalyticAnomalySummary {
    metadata: IAnalyticAnomalyImpossibleTravelSummaryMetadata;
}

export type IAnalyticAnomalyLoginSpikeIpSummaryMetadata = {
    minUniqueAccounts: number;
};

export interface IAnalyticAnomalyLoginSpikeIpSummary extends IAnalyticAnomalySummary {
    metadata: IAnalyticAnomalyLoginSpikeIpSummaryMetadata;
}

export interface IAnalyticAnomalyFailedLoginSpikeSummaryMetadata {
    nearLockoutMinAttempt: number;
}

export interface IAnalyticAnomalyFailedLoginSpikeSummary extends IAnalyticAnomalySummary {
    metadata: IAnalyticAnomalyFailedLoginSpikeSummaryMetadata;
}

export type IAnalyticAnomalyDeviceProliferationSummaryMetadata = {
    avg: number;
    stdDev: number;
    zScoreThreshold: number;
};

export interface IAnalyticAnomalyDeviceProliferationSummary extends IAnalyticAnomalySummary {
    metadata: IAnalyticAnomalyDeviceProliferationSummaryMetadata;
}

export type IAnalyticImpossibleTravel = {
    userId: string;
    fromSessionId: string;
    toSessionId: string;
    distanceKm: number;
    deltaMs: number;
};

export type IAnalyticLoginSpikeIp = {
    ipAddress: string;
    uniqueUsers: number;
    attempts: number;
};

export interface IAnalyticNearLockout {
    id: string;
    email: string;
    passwordAttempt: number;
    lastLoginAt: Date | null;
    createdAt: Date;
}

export type IAnalyticDeviceProliferation = {
    userId: string;
    deviceCount: number;
    zScore: number;
};

export interface IAnalyticDeviceProliferationResult {
    avg: number;
    stdDev: number;
    rows: IAnalyticDeviceProliferation[];
}

export interface IAnalyticImpossibleTravelThresholds {
    minDistanceKm: number;
    maxDeltaInMs: number;
}
