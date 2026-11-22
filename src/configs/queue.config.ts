import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigQueue {
    job: {
        maxAttempts: number;
        keepLogs: number;
        removeOnCompleteAgeInSeconds: number;
        removeOnFailAgeInSeconds: number;
        defaultBackoffDelayInMs: number;
        emailBackoffDelayInMs: number;
        pushBackoffDelayInMs: number;
        smsBackoffDelayInMs: number;
        notificationBackoffDelayInMs: number;
        workspaceBackoffDelayInMs: number;
        analyticBackoffDelayInMs: number;
        activityLogBackoffDelayInMs: number;
        termPolicyBackoffDelayInMs: number;
        userBackoffDelayInMs: number;
        userAuthBackoffDelayInMs: number;
        outboxBackoffDelayInMs: number;
        cacheBackoffDelayInMs: number;
    };
}

export default registerAs('queue', (): IConfigQueue => ({
    job: {
        maxAttempts: 3,
        keepLogs: 20,
        removeOnCompleteAgeInSeconds: ms('7d') / 1000,
        removeOnFailAgeInSeconds: ms('14d') / 1000,
        defaultBackoffDelayInMs: ms('3s'),
        emailBackoffDelayInMs: ms('10s'),
        pushBackoffDelayInMs: ms('5s'),
        smsBackoffDelayInMs: ms('5s'),
        notificationBackoffDelayInMs: ms('3s'),
        workspaceBackoffDelayInMs: ms('10s'),
        analyticBackoffDelayInMs: ms('10s'),
        activityLogBackoffDelayInMs: ms('10s'),
        termPolicyBackoffDelayInMs: ms('10s'),
        userBackoffDelayInMs: ms('10s'),
        userAuthBackoffDelayInMs: ms('3s'),
        outboxBackoffDelayInMs: ms('10s'),
        cacheBackoffDelayInMs: ms('3s'),
    },
}));
