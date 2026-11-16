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
        stepPattern: '{notificationId}-{step}',
    },
}));
