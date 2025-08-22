import { registerAs } from '@nestjs/config';

export interface IConfigDatabase {
    url: string;
    debug: boolean;
}

export default registerAs(
    'database',
    (): IConfigDatabase => ({
        url:
            process.env?.DATABASE_URL ??
            'mongodb://localhost:27017,localhost:27018,localhost:27019',
        debug: process.env.DATABASE_DEBUG === 'true',
    })
);
