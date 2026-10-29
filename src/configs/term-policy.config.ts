import { registerAs } from '@nestjs/config';
import bytes from 'bytes';

export interface IConfigTermPolicy {
    uploadContentPath: string;
    contentPublicPath: string;
    content: {
        maxSizeInBytes: number;
    };
    jobId: {
        deleteContentPattern: string;
    };
}

export default registerAs('termPolicy', (): IConfigTermPolicy => ({
    uploadContentPath: 'term-policies/{type}/v{version}',
    contentPublicPath: 'term-policies/{type}/v{version}',
    content: {
        maxSizeInBytes: bytes('10mb') ?? 0,
    },
    jobId: {
        deleteContentPattern: '{process}-{nonce}',
    },
}));
