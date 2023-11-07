import { registerAs } from '@nestjs/config';

export default registerAs(
    'email',
    (): Record<string, any> => ({
        fromEmail: 'noreply@mail.com',
        signUpPlainBody: 'Hi {{name}}, welcome to {{appName}}',
        changePasswordPlainBody: 'Hi {{name}}, you password has changed',
    })
);
