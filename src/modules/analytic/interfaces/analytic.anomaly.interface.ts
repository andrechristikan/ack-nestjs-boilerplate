export interface IAnalyticAnomalySummary {
    count: number;
    window: string | null;
}

export interface IAnalyticAnomalyImpossibleTravelSummaryMeta {
    minDistanceKm: number;
    maxDeltaInMs: number;
}

export interface IAnalyticAnomalyImpossibleTravelSummary extends IAnalyticAnomalySummary {
    meta: IAnalyticAnomalyImpossibleTravelSummaryMeta;
}

export interface IAnalyticAnomalyLoginSpikeIpSummaryMeta {
    minUniqueAccounts: number;
}

export interface IAnalyticAnomalyLoginSpikeIpSummary extends IAnalyticAnomalySummary {
    meta: IAnalyticAnomalyLoginSpikeIpSummaryMeta;
}

export interface IAnalyticAnomalyFailedLoginSpikeSummaryMeta {
    nearLockoutMinAttempt: number;
    bucketCount: number;
}

export interface IAnalyticAnomalyFailedLoginSpikeSummary extends IAnalyticAnomalySummary {
    meta: IAnalyticAnomalyFailedLoginSpikeSummaryMeta;
}

export interface IAnalyticAnomalyDeviceProliferationSummaryMeta {
    avg: number;
    stdDev: number;
    zScoreThreshold: number;
}

export interface IAnalyticAnomalyDeviceProliferationSummary extends IAnalyticAnomalySummary {
    meta: IAnalyticAnomalyDeviceProliferationSummaryMeta;
}

export interface IAnalyticImpossibleTravel {
    userId: string;
    fromSessionId: string;
    toSessionId: string;
    distanceKm: number;
    deltaMs: number;
}

export interface IAnalyticLoginSpikeIp {
    ipAddress: string;
    uniqueUsers: number;
    attempts: number;
}

export interface IAnalyticNearLockout {
    id: string;
    email: string;
    passwordAttempt: number | null;
    lastLoginAt: Date | null;
    createdAt: Date;
}

export interface IAnalyticDeviceProliferation {
    userId: string;
    deviceCount: number;
    zScore: number;
}

export interface IAnalyticDeviceProliferationResult {
    count: number;
    avg: number;
    stdDev: number;
    rows: IAnalyticDeviceProliferation[];
}

export interface IAnalyticLoginTimeAnomaly {
    userId: string;
    lastHour: number;
    historicalFrequencyPercent: number;
}
