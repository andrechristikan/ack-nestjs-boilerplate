import { registerAs } from '@nestjs/config';

export interface IUserConfig {
    usernamePrefix: string;
    usernamePattern: RegExp;
    uploadPhotoProfilePath: string;
}

export default registerAs(
    'user',
    (): IUserConfig => ({
        usernamePrefix: 'user',
        usernamePattern: /^[a-zA-Z0-9-_]+$/,
        uploadPhotoProfilePath: '/users/{userId}/profile',
    })
);
