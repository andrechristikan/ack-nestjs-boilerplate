import { registerAs } from '@nestjs/config';

export interface IConfigEmail {
    noreply: string | null;
    support: string | null;
    admin: string | null;
    batchSize: number;
}

export default registerAs(
    'email',
    (): IConfigEmail => ({
        noreply: process.env.EMAIL_NO_REPLY ?? null,
        support: process.env.EMAIL_SUPPORT ?? null,
        admin: process.env.EMAIL_ADMIN ?? null,
        batchSize: 100,
    })
);
