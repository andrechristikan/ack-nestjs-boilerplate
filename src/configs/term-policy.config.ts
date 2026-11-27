import { registerAs } from '@nestjs/config';
import bytes from 'bytes';
import ms from 'ms';

export interface IConfigTermPolicy {
    uploadContentPathPattern: string;
    contentPublicPathPattern: string;
    contentKeyRandomLength: number;
    content: {
        maxSizeInBytes: number;
    };
    idempotencyKey: {
        publishPattern: string;
        resendPublishPattern: string;
    };
    queue: {
        maxAttempts: number;
        keepLogs: number;
        removeOnCompleteAgeInSeconds: number;
        removeOnFailAgeInSeconds: number;
        backoffDelayInMs: number;
    };
}

export default registerAs('termPolicy', (): IConfigTermPolicy => ({
    uploadContentPathPattern: 'term-policies/{type}/v{version}',
    contentPublicPathPattern: 'term-policies/{type}/v{version}',
    contentKeyRandomLength: 20,
    content: {
        maxSizeInBytes: bytes('10mb') ?? 0,
    },
    idempotencyKey: {
        publishPattern: '{process}-{termPolicyId}',
        resendPublishPattern: '{process}-{termPolicyId}-{resendNonce}',
    },
    queue: {
        maxAttempts: 3,
        keepLogs: 20,
        removeOnCompleteAgeInSeconds: ms('7d') / 1000,
        removeOnFailAgeInSeconds: ms('14d') / 1000,
        backoffDelayInMs: ms('10s'),
    },
}));
