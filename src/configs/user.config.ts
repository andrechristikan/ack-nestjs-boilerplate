import { registerAs } from '@nestjs/config';

export default registerAs(
    'user',
    (): Record<string, any> => ({
        usernamePrefix: 'user',
        usernamePattern: /^[a-zA-Z0-9-_]+$/,
        uploadPath: '/users/{user}',
    })
);
