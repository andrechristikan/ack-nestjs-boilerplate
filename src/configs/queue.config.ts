import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigQueue {
    job: {
        maxAttempts: number;
        removeOnCompleteAgeInSeconds: number;
        removeOnFailAgeInSeconds: number;
        defaultBackoffDelayInMs: number;
    };
}

export default registerAs('queue', (): IConfigQueue => ({
    job: {
        maxAttempts: 3,
        removeOnCompleteAgeInSeconds: ms('7d') / 1000,
        removeOnFailAgeInSeconds: ms('14d') / 1000,
        defaultBackoffDelayInMs: ms('3s'),
    },
}));
