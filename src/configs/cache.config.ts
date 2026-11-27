import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigCache {
    queue: {
        maxAttempts: number;
        keepLogs: number;
        removeOnCompleteAgeInSeconds: number;
        removeOnFailAgeInSeconds: number;
        backoffDelayInMs: number;
    };
}

export default registerAs('cache', (): IConfigCache => ({
    queue: {
        maxAttempts: 3,
        keepLogs: 20,
        removeOnCompleteAgeInSeconds: ms('7d') / 1000,
        removeOnFailAgeInSeconds: ms('14d') / 1000,
        backoffDelayInMs: ms('3s'),
    },
}));
