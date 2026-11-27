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
    createTimeoutInMs: number;
    createBulkTimeoutInMs: number;
    export: {
        pathPattern: string;
        presignExpiresInSeconds: number;
    };
    deleteSelfTimeoutInMs: number;
    deleteSelfEmailPattern: string;
    deleteSelfUsernamePattern: string;
    deletedMobileNumberPattern: string;
    queue: {
        maxAttempts: number;
        keepLogs: number;
        removeOnCompleteAgeInSeconds: number;
        removeOnFailAgeInSeconds: number;
        backoffDelayInMs: number;
        authBackoffDelayInMs: number;
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
    createTimeoutInMs: ms('10s'),
    createBulkTimeoutInMs: ms('30s'),
    export: {
        pathPattern: '{temporaryPath}/exports/users/{outboxId}.csv',
        presignExpiresInSeconds: ms('24h') / 1000,
    },
    deleteSelfTimeoutInMs: ms('30s'),
    deleteSelfEmailPattern: 'deleted.{id}',
    deleteSelfUsernamePattern: 'deleted.{id}',
    deletedMobileNumberPattern: 'deleted-{id}',
    queue: {
        maxAttempts: 3,
        keepLogs: 20,
        removeOnCompleteAgeInSeconds: ms('7d') / 1000,
        removeOnFailAgeInSeconds: ms('14d') / 1000,
        backoffDelayInMs: ms('10s'),
        authBackoffDelayInMs: ms('3s'),
    },
}));
