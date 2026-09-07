/** Asserts at least one uppercase letter, one lowercase letter, and one digit. Length is checked separately. */
export const RequestPasswordStrengthRegex =
    /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])/;

export const RequestCustomTimeoutMetaKey = 'RequestCustomTimeoutMetaKey';

export const RequestCustomTimeoutValueMetaKey =
    'RequestCustomTimeoutValueMetaKey';

export const RequestEnvMetaKey = 'RequestEnvMetaKey';

export const RequestThrottleOptionsMetaKey = 'RequestThrottleOptionsMetaKey';

export const RequestLogStoreKey = 'RequestLogStore';
export const RequestLanguageStoreKey = 'RequestLanguageStore';
export const RequestVersionStoreKey = 'RequestVersionStore';
export const RequestCorrelationIdStoreKey = 'RequestCorrelationIdStore';
export const RequestIdStoreKey = 'RequestIdStore';
export const RequestActorStoreKey = 'RequestActorStore';
export const RequestThrottleHandledStoreKey = 'RequestThrottleHandledStore';
