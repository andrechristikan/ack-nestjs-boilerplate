export interface ICacheLease {
    key: string;
    ttlInMs: number;
}

export interface ICacheReadThroughOptions {
    lease?: ICacheLease;
}

export interface ICacheInvalidatePayload {
    keys: string[];
}
