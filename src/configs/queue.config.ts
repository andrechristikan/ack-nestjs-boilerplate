import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigQueue {
    job: {
        attempts: number;
        removeOnComplete: number;
        removeOnFail: number;
        emailBackoffDelayInMs: number;
        pushBackoffDelayInMs: number;
        notificationBackoffDelayInMs: number;
    };
}

export default registerAs(
    'queue',
    (): IConfigQueue => ({
        job: {
            attempts: 3,
            removeOnComplete: 50,
            removeOnFail: 100,
            emailBackoffDelayInMs: ms('10s'),
            pushBackoffDelayInMs: ms('5s'),
            notificationBackoffDelayInMs: ms('3s'),
        },
    })
);
