import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigQueue {
    job: {
        attempts: number;
        keepLogs: number;
        removeOnCompleteAgeInSeconds: number;
        removeOnFailAgeInSeconds: number;
        emailBackoffDelayInMs: number;
        pushBackoffDelayInMs: number;
        smsBackoffDelayInMs: number;
        notificationBackoffDelayInMs: number;
        workspaceBackoffDelayInMs: number;
    };
}

export default registerAs('queue', (): IConfigQueue => ({
    job: {
        attempts: 3,
        keepLogs: 20,
        removeOnCompleteAgeInSeconds: ms('7d') / 1000,
        removeOnFailAgeInSeconds: ms('14d') / 1000,
        emailBackoffDelayInMs: ms('10s'),
        pushBackoffDelayInMs: ms('5s'),
        smsBackoffDelayInMs: ms('10s'),
        notificationBackoffDelayInMs: ms('3s'),
        workspaceBackoffDelayInMs: ms('10s'),
    },
}));
