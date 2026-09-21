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
export const AnalyticNearLockoutAvailableOrderBy: (keyof IAnalyticNearLockout)[] =
    ['createdAt', 'id'];

/**
 * Sort fields the admin credential stuffing list accepts.
 * @public
 */
export const AnalyticCredentialStuffingAvailableOrderBy: (keyof IAnalyticCredentialStuffing)[] =
    ['ipAddress', 'uniqueUsers', 'failCount'];

/**
 * Sort fields the admin account takeover list accepts.
 * @public
 */
export const AnalyticAccountTakeoverAvailableOrderBy: (keyof IAnalyticAccountTakeover)[] =
    ['userId', 'passwordChangedAt'];

/**
 * Sort fields the admin key-and-count analytic lists accept.
 * @public
 */
export const AnalyticKeyCountAvailableOrderBy: (keyof IAnalyticMassRegistration)[] =
    ['key', 'count'];

/**
 * Sort fields the admin shared fingerprint list accepts.
 * @public
 */
export const AnalyticSharedFingerprintAvailableOrderBy: (keyof IAnalyticSharedFingerprint)[] =
    ['fingerprint', 'userCount'];

/**
 * Sort fields the admin session-after-admin list accepts.
 * @public
 */
export const AnalyticSessionAfterAdminAvailableOrderBy: (keyof IAnalyticSessionAfterAdmin)[] =
    ['userId', 'revokedAt', 'loginAt'];

/**
 * Sort fields the admin forgot password abuse list accepts.
 * @public
 */
export const AnalyticForgotPasswordAbuseAvailableOrderBy: (keyof IAnalyticForgotPasswordAbuse)[] =
    ['userId', 'tokenCount'];

/**
 * Sort fields the admin user-and-count analytic lists accept.
 * @public
 */
export const AnalyticUserCountAvailableOrderBy: (keyof IAnalyticRefreshSpike)[] =
    ['userId', 'count'];

/**
 * Sort fields the admin backup code new device list accepts.
 * @public
 */
export const AnalyticBackupCodeNewDeviceAvailableOrderBy: (keyof IAnalyticBackupCodeNewDevice)[] =
    ['userId', 'regeneratedAt'];

/**
 * Sort fields the admin fraud risk score list accepts.
 * @public
 */
export const AnalyticFraudRiskScoreAvailableOrderBy: (keyof IAnalyticFraudRiskScore)[] =
    ['userId', 'score', 'band'];

/**
 * Sort fields the admin impossible travel list accepts.
 * @public
 */
export const AnalyticImpossibleTravelAvailableOrderBy: (keyof IAnalyticImpossibleTravel)[] =
    ['userId', 'distanceKm', 'deltaMs'];

/**
 * Sort fields the admin login spike by IP list accepts.
 * @public
 */
export const AnalyticLoginSpikeIpAvailableOrderBy: (keyof IAnalyticLoginSpikeIp)[] =
    ['ipAddress', 'uniqueUsers', 'attempts'];

/**
 * Sort fields the admin device proliferation list accepts.
 * @public
 */
export const AnalyticDeviceProliferationAvailableOrderBy: (keyof IAnalyticDeviceProliferation)[] =
    ['userId', 'deviceCount', 'zScore'];

/**
 * Sort fields the admin login time anomaly list accepts.
 * @public
 */
export const AnalyticLoginTimeAnomalyAvailableOrderBy: (keyof IAnalyticLoginTimeAnomaly)[] =
    ['userId', 'lastHour', 'historicalFrequencyPercent'];
