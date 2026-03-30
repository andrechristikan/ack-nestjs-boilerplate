import { registerAs } from '@nestjs/config';

export interface IConfigEmail {
    noreply?: string;
    support?: string;
    admin?: string;
    batchSize: number;
}

export default registerAs(
    'email',
    (): IConfigEmail => ({
        noreply: process.env.EMAIL_NO_REPLY,
        support: process.env.EMAIL_SUPPORT,
        admin: process.env.EMAIL_ADMIN,
        batchSize: 100,
    })
);
