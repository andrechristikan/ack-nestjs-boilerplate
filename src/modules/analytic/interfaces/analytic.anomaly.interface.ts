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
