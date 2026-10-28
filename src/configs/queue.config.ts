import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigQueue {
    redis: {
        connectTimeoutInMs: number;
        maxRetriesPerRequest: number;
    };
    job: {
        attempts: number;
        keepLogs: number;
        removeOnCompleteAgeInSeconds: number;
        removeOnFailAgeInSeconds: number;
        emailBackoffDelayInMs: number;
        pushBackoffDelayInMs: number;
        notificationBackoffDelayInMs: number;
        workspaceBackoffDelayInMs: number;
        sessionBackoffDelayInMs: number;
        activityLogBackoffDelayInMs: number;
        termPolicyBackoffDelayInMs: number;
        userBackoffDelayInMs: number;
    };
}

export default registerAs('queue', (): IConfigQueue => ({
    redis: {
        connectTimeoutInMs: ms('5s'),
        maxRetriesPerRequest: 1,
    },
    job: {
        attempts: 3,
        keepLogs: 20,
        removeOnCompleteAgeInSeconds: ms('7d') / 1000,
        removeOnFailAgeInSeconds: ms('14d') / 1000,
        emailBackoffDelayInMs: ms('10s'),
        pushBackoffDelayInMs: ms('5s'),
        notificationBackoffDelayInMs: ms('3s'),
        workspaceBackoffDelayInMs: ms('10s'),
        sessionBackoffDelayInMs: ms('3s'),
        activityLogBackoffDelayInMs: ms('10s'),
        termPolicyBackoffDelayInMs: ms('10s'),
        userBackoffDelayInMs: ms('10s'),
    },
}));
