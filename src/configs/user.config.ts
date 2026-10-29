import { registerAs } from '@nestjs/config';
import bytes from 'bytes';
import ms from 'ms';

export interface IConfigUser {
    usernameRegex: RegExp;
    uploadPhotoProfilePath: string;
    photo: {
        maxSizeInBytes: number;
    };
    maxDataImport: number;
    maxDataExport: number;
    default: {
        role: string;
        country: string;
    };
    onboarding: {
        createTimeoutInMs: number;
        createBulkTimeoutInMs: number;
    };
    jobId: {
        deletePhotoPattern: string;
    };
}

export default registerAs('user', (): IConfigUser => ({
    usernameRegex: /^[a-zA-Z0-9-_]+$/,
    uploadPhotoProfilePath: 'users/{userId}/profile',
    photo: {
        maxSizeInBytes: bytes('2mb') ?? 0,
    },
    maxDataImport: 50,
    maxDataExport: 500,
    default: {
        role: 'user',
        country: 'ID',
    },
    onboarding: {
        createTimeoutInMs: ms('10s'),
        createBulkTimeoutInMs: ms('30s'),
    },
    jobId: {
        deletePhotoPattern: '{process}-{nonce}',
    },
}));
