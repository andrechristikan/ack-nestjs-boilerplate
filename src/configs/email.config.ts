import { registerAs } from '@nestjs/config';

export interface IConfigEmail {
    noreply: string;
    support: string;
    admin: string;
    batchSize: number;
}

export default registerAs(
    'email',
    (): IConfigEmail => ({
        noreply: process.env.EMAIL_NO_REPLY ?? 'noreply@mail.com',
        support: process.env.EMAIL_SUPPORT ?? 'support@mail.com',
        admin: process.env.EMAIL_ADMIN ?? 'admin@mail.com',
        batchSize: 100,
    })
);
