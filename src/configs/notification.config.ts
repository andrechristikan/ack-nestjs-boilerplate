import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigNotification {
    push: {
        cleanupStaleTokensCron: string;
        staleTokenThresholdInMs: number;
    };
    jobId: {
        userPattern: string;
        referencePattern: string;
        eventPattern: string;
        joinRequestPattern: string;
        termPolicyBatchPattern: string;
        termPolicyBatchResendPattern: string;
        termPolicyResendPattern: string;
        termPolicyPublishPattern: string;
        userTermPolicyPattern: string;
        stepPattern: string;
    };
}

export default registerAs('notification', (): IConfigNotification => ({
    push: {
        cleanupStaleTokensCron: '0 0 * * *',
        staleTokenThresholdInMs: ms('30d'),
    },
    jobId: {
        userPattern: '{process}-{userId}',
        referencePattern: '{process}-{reference}',
        eventPattern: '{process}-{eventId}',
        joinRequestPattern: '{process}-{joinRequestId}-{userId}',
        termPolicyBatchPattern: '{process}-{termPolicyId}-{batchId}',
        termPolicyBatchResendPattern:
            '{process}-{termPolicyId}-{batchId}-{resendNonce}',
        termPolicyResendPattern: '{process}-{termPolicyId}-{resendNonce}',
        termPolicyPublishPattern: '{process}-{termPolicyId}',
        userTermPolicyPattern: '{process}-{userId}-{termPolicyId}',
        stepPattern: '{notificationId}-{step}',
    },
}));
