import { registerAs } from '@nestjs/config';
import bytes from 'bytes';
import ms from 'ms';

export interface IConfigUser {
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
    create: {
        timeoutInMs: number;
        bulkTimeoutInMs: number;
    };
    deleteSelf: {
        timeoutInMs: number;
    };
    jobId: {
        deletePhotoPattern: string;
    };
}

export default registerAs('user', (): IConfigUser => ({
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
    create: {
        timeoutInMs: ms('10s'),
        bulkTimeoutInMs: ms('30s'),
    },
    deleteSelf: {
        timeoutInMs: ms('30s'),
    },
    jobId: {
        deletePhotoPattern: '{process}-{nonce}',
    },
}));
