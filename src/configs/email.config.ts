import { registerAs } from '@nestjs/config';

export interface IConfigEmail {
    fromEmail: string;
    supportEmail: string;
}

export default registerAs(
    'email',
    (): IConfigEmail => ({
        fromEmail: 'noreply@mail.com',
        supportEmail: 'support@mail.com',
    })
);
