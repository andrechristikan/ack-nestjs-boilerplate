import type {
    IAnalyticDeviceProliferation,
    IAnalyticImpossibleTravel,
    IAnalyticLoginSpikeIp,
    IAnalyticLoginTimeAnomaly,
    IAnalyticNearLockout,
} from '@modules/analytic/interfaces/analytic.anomaly.interface';
import type {
    IAnalyticAccountTakeover,
    IAnalyticBackupCodeNewDevice,
    IAnalyticCredentialStuffing,
    IAnalyticForgotPasswordAbuse,
    IAnalyticFraudRiskScore,
    IAnalyticMassRegistration,
    IAnalyticRefreshSpike,
    IAnalyticSessionAfterAdmin,
    IAnalyticSharedFingerprint,
} from '@modules/analytic/interfaces/analytic.fraud.interface';

/** @public */
export const AnalyticNearLockoutAvailableOrderBy = [
    'createdAt',
    'id',
] as const satisfies ReadonlyArray<keyof IAnalyticNearLockout>;

/** @public */
export const AnalyticCredentialStuffingAvailableOrderBy = [
    'ipAddress',
    'uniqueUsers',
    'failCount',
] as const satisfies ReadonlyArray<keyof IAnalyticCredentialStuffing>;

/** @public */
export const AnalyticAccountTakeoverAvailableOrderBy = [
    'userId',
    'passwordChangedAt',
] as const satisfies ReadonlyArray<keyof IAnalyticAccountTakeover>;

/** @public */
export const AnalyticKeyCountAvailableOrderBy = [
    'key',
    'count',
] as const satisfies ReadonlyArray<keyof IAnalyticMassRegistration>;

/** @public */
export const AnalyticSharedFingerprintAvailableOrderBy = [
    'fingerprint',
    'userCount',
] as const satisfies ReadonlyArray<keyof IAnalyticSharedFingerprint>;

/** @public */
export const AnalyticSessionAfterAdminAvailableOrderBy = [
    'userId',
    'revokedAt',
    'loginAt',
] as const satisfies ReadonlyArray<keyof IAnalyticSessionAfterAdmin>;

/** @public */
export const AnalyticForgotPasswordAbuseAvailableOrderBy = [
    'userId',
    'tokenCount',
] as const satisfies ReadonlyArray<keyof IAnalyticForgotPasswordAbuse>;

/** @public */
export const AnalyticUserCountAvailableOrderBy = [
    'userId',
    'count',
] as const satisfies ReadonlyArray<keyof IAnalyticRefreshSpike>;

/** @public */
export const AnalyticBackupCodeNewDeviceAvailableOrderBy = [
    'userId',
    'regeneratedAt',
] as const satisfies ReadonlyArray<keyof IAnalyticBackupCodeNewDevice>;

/** @public */
export const AnalyticFraudRiskScoreAvailableOrderBy = [
    'userId',
    'score',
    'band',
] as const satisfies ReadonlyArray<keyof IAnalyticFraudRiskScore>;

/** @public */
export const AnalyticImpossibleTravelAvailableOrderBy = [
    'userId',
    'distanceKm',
    'deltaMs',
] as const satisfies ReadonlyArray<keyof IAnalyticImpossibleTravel>;

/** @public */
export const AnalyticLoginSpikeIpAvailableOrderBy = [
    'ipAddress',
    'uniqueUsers',
    'attempts',
] as const satisfies ReadonlyArray<keyof IAnalyticLoginSpikeIp>;

/** @public */
export const AnalyticDeviceProliferationAvailableOrderBy = [
    'userId',
    'deviceCount',
    'zScore',
] as const satisfies ReadonlyArray<keyof IAnalyticDeviceProliferation>;

/** @public */
export const AnalyticLoginTimeAnomalyAvailableOrderBy = [
    'userId',
    'lastHour',
    'historicalFrequencyPercent',
] as const satisfies ReadonlyArray<keyof IAnalyticLoginTimeAnomaly>;
