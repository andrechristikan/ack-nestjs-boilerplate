import { registerAs } from '@nestjs/config';

export interface IUserConfig {
    usernamePattern: RegExp;
    uploadPhotoProfilePath: string;
    maxDataImport: number;
    default: {
        role: string;
        country: string;
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
    })
);
