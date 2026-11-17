import { registerAs } from '@nestjs/config';
import bytes from 'bytes';

export interface IConfigTermPolicy {
    uploadContentPathPattern: string;
    contentPublicPathPattern: string;
    content: {
        maxSizeInBytes: number;
    };
    idempotencyKey: {
        copyContentPattern: string;
        publishPattern: string;
        resendPublishPattern: string;
    };
}

export default registerAs('termPolicy', (): IConfigTermPolicy => ({
    uploadContentPathPattern: 'term-policies/{type}/v{version}',
    contentPublicPathPattern: 'term-policies/{type}/v{version}',
    content: {
        maxSizeInBytes: bytes('10mb') ?? 0,
    },
    idempotencyKey: {
        copyContentPattern: '{process}-{termPolicyId}',
        publishPattern: '{process}-{termPolicyId}',
        resendPublishPattern: '{process}-{termPolicyId}-{resendNonce}',
    },
}));
