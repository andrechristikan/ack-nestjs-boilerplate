import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigSession {
    keyPattern: string;
    loginCacheTtlInMs: number;
    idleTimeoutInMs: number;
    retentionInMs: number;
    purgeExpiredCron: string;
    queue: {
        maxAttempts: number;
        keepLogs: number;
        removeOnCompleteAgeInSeconds: number;
        removeOnFailAgeInSeconds: number;
        backoffDelayInMs: number;
    };
}

export default registerAs('session', (): IConfigSession => ({
    keyPattern: 'User:{userId}:Session:{sessionId}',
    loginCacheTtlInMs: ms('15m'),
    idleTimeoutInMs: ms('7d'),
    retentionInMs: ms('90d'),
    purgeExpiredCron: '0 3 * * *',
    queue: {
        maxAttempts: 3,
        keepLogs: 20,
        removeOnCompleteAgeInSeconds: ms('7d') / 1000,
        removeOnFailAgeInSeconds: ms('14d') / 1000,
        backoffDelayInMs: ms('3s'),
    },
}));
