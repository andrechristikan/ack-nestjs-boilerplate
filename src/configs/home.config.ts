import { registerAs } from '@nestjs/config';

export interface IConfigHome {
    name: string;
    url: string;
}

export default registerAs(
    'home',
    (): IConfigHome => ({
        name: process.env.HOME_NAME ?? 'NestJs ACK Boilerplate',
        url: process.env.HOME_URL ?? 'https://example.com',
    })
);
