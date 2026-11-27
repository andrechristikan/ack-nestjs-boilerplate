import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigActivityLog {
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

export default registerAs('activityLog', (): IConfigActivityLog => ({
    retentionInMs: ms('365d'),
    purgeExpiredCron: '0 3 * * *',
    queue: {
        maxAttempts: 3,
        keepLogs: 20,
        removeOnCompleteAgeInSeconds: ms('7d') / 1000,
        removeOnFailAgeInSeconds: ms('14d') / 1000,
        backoffDelayInMs: ms('10s'),
    },
}));
