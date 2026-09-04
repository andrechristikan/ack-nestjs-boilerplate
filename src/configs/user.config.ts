import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IUserConfig {
    usernamePattern: RegExp;
    uploadPhotoProfilePath: string;
    maxDataImport: number;
    default: {
        role: string;
        country: string;
    };
    onboarding: {
        createTimeoutInMs: number;
        createBulkTimeoutInMs: number;
    };
}

export default registerAs(
    'user',
    (): IUserConfig => ({
        usernamePattern: /^[a-zA-Z0-9-_]+$/,
        uploadPhotoProfilePath: 'users/{userId}/profile',
        maxDataImport: 50,
        default: {
            role: 'user',
            country: 'ID',
        },
        onboarding: {
            createTimeoutInMs: ms('10s'),
            createBulkTimeoutInMs: ms('30s'),
        },
    })
);
