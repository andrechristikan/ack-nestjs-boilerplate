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

/**
 * Sort fields the admin near-lockout list accepts.
 * @public
 */
export const AnalyticNearLockoutAvailableOrderBy = [
    'createdAt',
    'id',
] as const satisfies ReadonlyArray<keyof IAnalyticNearLockout>;

/**
 * Sort fields the admin credential stuffing list accepts.
 * @public
 */
export const AnalyticCredentialStuffingAvailableOrderBy = [
    'ipAddress',
    'uniqueUsers',
    'failCount',
] as const satisfies ReadonlyArray<keyof IAnalyticCredentialStuffing>;

/**
 * Sort fields the admin account takeover list accepts.
 * @public
 */
export const AnalyticAccountTakeoverAvailableOrderBy = [
    'userId',
    'passwordChangedAt',
] as const satisfies ReadonlyArray<keyof IAnalyticAccountTakeover>;

/**
 * Sort fields the admin key-and-count analytic lists accept.
 * @public
 */
export const AnalyticKeyCountAvailableOrderBy = [
    'key',
    'count',
] as const satisfies ReadonlyArray<keyof IAnalyticMassRegistration>;

/**
 * Sort fields the admin shared fingerprint list accepts.
 * @public
 */
export const AnalyticSharedFingerprintAvailableOrderBy = [
    'fingerprint',
    'userCount',
] as const satisfies ReadonlyArray<keyof IAnalyticSharedFingerprint>;

/**
 * Sort fields the admin session-after-admin list accepts.
 * @public
 */
export const AnalyticSessionAfterAdminAvailableOrderBy = [
    'userId',
    'revokedAt',
    'loginAt',
] as const satisfies ReadonlyArray<keyof IAnalyticSessionAfterAdmin>;

/**
 * Sort fields the admin forgot password abuse list accepts.
 * @public
 */
export const AnalyticForgotPasswordAbuseAvailableOrderBy = [
    'userId',
    'tokenCount',
] as const satisfies ReadonlyArray<keyof IAnalyticForgotPasswordAbuse>;

/**
 * Sort fields the admin user-and-count analytic lists accept.
 * @public
 */
export const AnalyticUserCountAvailableOrderBy = [
    'userId',
    'count',
] as const satisfies ReadonlyArray<keyof IAnalyticRefreshSpike>;

/**
 * Sort fields the admin backup code new device list accepts.
 * @public
 */
export const AnalyticBackupCodeNewDeviceAvailableOrderBy = [
    'userId',
    'regeneratedAt',
] as const satisfies ReadonlyArray<keyof IAnalyticBackupCodeNewDevice>;

/**
 * Sort fields the admin fraud risk score list accepts.
 * @public
 */
export const AnalyticFraudRiskScoreAvailableOrderBy = [
    'userId',
    'score',
    'band',
] as const satisfies ReadonlyArray<keyof IAnalyticFraudRiskScore>;

/**
 * Sort fields the admin impossible travel list accepts.
 * @public
 */
export const AnalyticImpossibleTravelAvailableOrderBy = [
    'userId',
    'distanceKm',
    'deltaMs',
] as const satisfies ReadonlyArray<keyof IAnalyticImpossibleTravel>;

/**
 * Sort fields the admin login spike by IP list accepts.
 * @public
 */
export const AnalyticLoginSpikeIpAvailableOrderBy = [
    'ipAddress',
    'uniqueUsers',
    'attempts',
] as const satisfies ReadonlyArray<keyof IAnalyticLoginSpikeIp>;

/**
 * Sort fields the admin device proliferation list accepts.
 * @public
 */
export const AnalyticDeviceProliferationAvailableOrderBy = [
    'userId',
    'deviceCount',
    'zScore',
] as const satisfies ReadonlyArray<keyof IAnalyticDeviceProliferation>;

/**
 * Sort fields the admin login time anomaly list accepts.
 * @public
 */
export const AnalyticLoginTimeAnomalyAvailableOrderBy = [
    'userId',
    'lastHour',
    'historicalFrequencyPercent',
] as const satisfies ReadonlyArray<keyof IAnalyticLoginTimeAnomaly>;
