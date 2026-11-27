import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigNotification {
    push: {
        cleanupStaleTokensCron: string;
        staleTokenThresholdInMs: number;
    };
    idempotencyKey: {
        userPattern: string;
        referencePattern: string;
        joinRequestPattern: string;
        termPolicyBatchPattern: string;
        termPolicyBatchResendPattern: string;
        userTermPolicyPattern: string;
        stepPattern: string;
    };
    queue: {
        maxAttempts: number;
        keepLogs: number;
        removeOnCompleteAgeInSeconds: number;
        removeOnFailAgeInSeconds: number;
        backoffDelayInMs: number;
        emailBackoffDelayInMs: number;
        pushBackoffDelayInMs: number;
        smsBackoffDelayInMs: number;
    };
}

export default registerAs('notification', (): IConfigNotification => ({
    push: {
        cleanupStaleTokensCron: '0 0 * * *',
        staleTokenThresholdInMs: ms('30d'),
    },
    idempotencyKey: {
        userPattern: '{process}-{userId}',
        referencePattern: '{process}-{reference}',
        joinRequestPattern: '{process}-{joinRequestId}-{userId}',
        termPolicyBatchPattern: '{process}-{termPolicyId}-{batchId}',
        termPolicyBatchResendPattern:
            '{process}-{termPolicyId}-{batchId}-{resendNonce}',
        userTermPolicyPattern: '{process}-{userId}-{termPolicyId}',
        stepPattern: '{process}-{notificationId}',
    },
    queue: {
        maxAttempts: 3,
        keepLogs: 20,
        removeOnCompleteAgeInSeconds: ms('7d') / 1000,
        removeOnFailAgeInSeconds: ms('14d') / 1000,
        backoffDelayInMs: ms('3s'),
        emailBackoffDelayInMs: ms('10s'),
        pushBackoffDelayInMs: ms('5s'),
        smsBackoffDelayInMs: ms('5s'),
    },
}));
