import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigOutbox {
    sweepIntervalInMs: number;
    pendingAfterInMs: number;
    enqueuedAfterInMs: number;
    sweepBatch: number;
    sweepKeepCompleted: number;
    retentionInMs: number;
    scrubExpiredCron: string;
    queue: {
        maxAttempts: number;
        keepLogs: number;
        removeOnCompleteAgeInSeconds: number;
        removeOnFailAgeInSeconds: number;
        backoffDelayInMs: number;
    };
}

export default registerAs('outbox', (): IConfigOutbox => ({
    sweepIntervalInMs: ms('1m'),
    pendingAfterInMs: ms('30s'),
    enqueuedAfterInMs: ms('1h'),
    sweepBatch: 100,
    sweepKeepCompleted: 20,
    retentionInMs: ms('30d'),
    scrubExpiredCron: '0 4 * * *',
    queue: {
        maxAttempts: 3,
        keepLogs: 20,
        removeOnCompleteAgeInSeconds: ms('7d') / 1000,
        removeOnFailAgeInSeconds: ms('14d') / 1000,
        backoffDelayInMs: ms('10s'),
    },
}));
