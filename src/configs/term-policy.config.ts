import { registerAs } from '@nestjs/config';
import bytes from 'bytes';

export interface IConfigTermPolicy {
    uploadContentPath: string;
    contentPublicPath: string;
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
    uploadContentPath: 'term-policies/{type}/v{version}',
    contentPublicPath: 'term-policies/{type}/v{version}',
    content: {
        maxSizeInBytes: bytes('10mb') ?? 0,
    },
    idempotencyKey: {
        copyContentPattern: '{process}-{termPolicyId}',
        publishPattern: '{process}-{termPolicyId}',
        resendPublishPattern: '{process}-{termPolicyId}-{resendNonce}',
    },
}));
