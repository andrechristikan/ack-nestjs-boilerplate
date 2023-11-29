import { registerAs } from '@nestjs/config';

export default registerAs(
    'email',
    (): Record<string, any> => ({
        // for migration
        fromEmail: 'noreply@mail.com',

        // for migration
        signUpPlainBody: 'Hi {{name}}, welcome to {{appName}}',

        // for migration
        changePasswordPlainBody: 'Hi {{name}}, you password has changed',
    })
);
