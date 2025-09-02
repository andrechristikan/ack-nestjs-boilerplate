import { registerAs } from '@nestjs/config';

export interface IConfigEmail {
    noreply: string;
    support: string;
    admin: string;
}

export default registerAs(
    'email',
    (): IConfigEmail => ({
        noreply: 'noreply@mail.com',
        support: 'support@mail.com',
        admin: 'admin@mail.com',
    })
);
