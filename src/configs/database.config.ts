import { registerAs } from '@nestjs/config';

export interface IConfigDatabase {
    url: string;
    debug: boolean;
}

export default registerAs(
    'database',
    (): IConfigDatabase => ({
        url: process.env.DATABASE_URL!,
        debug: process.env.DATABASE_DEBUG === 'true',
    })
);
