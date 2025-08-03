import { registerAs } from '@nestjs/config';

export interface IUserConfig {
    usernamePrefix: string;
    usernamePattern: RegExp;
    uploadPath: string;
}

export default registerAs(
    'user',
    (): IUserConfig => ({
        usernamePrefix: 'user',
        usernamePattern: /^[a-zA-Z0-9-_]+$/,
        uploadPath: '/users/{user}',
    })
);
