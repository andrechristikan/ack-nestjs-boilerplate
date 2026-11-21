import { registerAs } from '@nestjs/config';
import bytes from 'bytes';
import ms from 'ms';

export interface IConfigUser {
    uploadPhotoProfilePathPattern: string;
    photo: {
        maxSizeInBytes: number;
        filenameRandomLength: number;
    };
    purgeExpiredCron: string;
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
    export: {
        pathPattern: string;
        presignExpiresInSeconds: number;
    };
    deleteSelf: {
        timeoutInMs: number;
        emailPattern: string;
        usernamePattern: string;
    };
}

export default registerAs('user', (): IConfigUser => ({
    uploadPhotoProfilePathPattern: 'users/{userId}/profile',
    photo: {
        maxSizeInBytes: bytes('2mb') ?? 0,
        filenameRandomLength: 20,
    },
    purgeExpiredCron: '0 3 * * *',
    maxDataImport: 50,
    maxDataExport: 5000,
    default: {
        role: 'user',
        country: 'ID',
    },
    create: {
        timeoutInMs: ms('10s'),
        bulkTimeoutInMs: ms('30s'),
    },
    export: {
        pathPattern: '{temporaryPath}/exports/users/{outboxId}.csv',
        presignExpiresInSeconds: ms('24h') / 1000,
    },
    deleteSelf: {
        timeoutInMs: ms('30s'),
        emailPattern: 'deleted.{id}',
        usernamePattern: 'deleted.{id}',
    },
}));
