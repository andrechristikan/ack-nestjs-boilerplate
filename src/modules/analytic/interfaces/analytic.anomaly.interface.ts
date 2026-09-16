export interface IAnalyticAnomalySummaryMeta {
    minDistanceKm?: number;
    maxDeltaInMs?: number;
    minUniqueAccounts?: number;
    nearLockoutMinAttempt?: number;
    bucketCount?: number;
    avg?: number;
    stdDev?: number;
    zScoreThreshold?: number;
}

export interface IAnalyticAnomalySummary {
    count: number;
    window?: string;
    meta?: IAnalyticAnomalySummaryMeta;
}

export interface IAnalyticImpossibleTravelRow {
    userId: string;
    fromSessionId: string;
    toSessionId: string;
    distanceKm: number;
    deltaMs: number;
}

export interface IAnalyticLoginSpikeIpRow {
    ipAddress: string;
    uniqueUsers: number;
    attempts: number;
}

export interface IAnalyticNearLockoutRow {
    id: string;
    email: string;
    passwordAttempt: number | null;
    lastLoginAt?: Date | null;
}

export interface IAnalyticDeviceProliferationRow {
    userId: string;
    deviceCount: number;
    zScore: number;
}

export interface IAnalyticDeviceProliferationResult {
    count: number;
    avg: number;
    stdDev: number;
    rows: IAnalyticDeviceProliferationRow[];
}

export interface IAnalyticLoginTimeAnomalyRow {
    userId: string;
    lastHour: number;
    historicalFrequencyPercent: number;
}
