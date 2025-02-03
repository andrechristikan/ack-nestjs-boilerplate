import { registerAs } from '@nestjs/config';

export default registerAs(
    'email',
    (): Record<string, any> => ({
        fromEmail: 'noreply@mail.com',
        supportEmail: 'support@mail.com',
    })
);
